import express from "express";
import mongoose from "mongoose";
const WeatherRoute = express.Router();
// schema created (verifies data according to it)
const weatherSchema = new mongoose.Schema({
  city: String,
  temperature: Number,
  humidity: Number,
  date: String,
  windSpeed: Number,
  condition: String,
  precipitation: Number
});
//creating a model-it shows how data is structured
const WeatherModel = mongoose.model("weather", weatherSchema);
//meteo has some codes representing the weather conditions.
function getCondition(code) {
  if (code === 0) return "Clear Sky";
  if (code >= 1 && code <= 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 56 && code <= 57) return "Freezing Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 66 && code <= 67) return "Freezing Rain";
  if (code >= 71 && code <= 75) return "Snow";
  if (code === 77) return "Snow Grains";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code === 95) return "Thunderstorm";
  if (code >= 96 && code <= 99) return "Thunderstorm";
  return "Unknown";
}
//crud opertaino to get location parameters
WeatherRoute.get("/weather/:city", async (req, res) => {
  try {
    const city = req.params.city;
    const locationResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );
    if (!locationResponse.ok) {
      throw new Error("Failed to find city");
    }
    const locationData = await locationResponse.json();
    if (
      !locationData.results ||
      locationData.results.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message: "City not found"
      });
    }
    const location = locationData.results[0];//the result provided by meteo is in array format
    // Fetch 10 days weather data
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=temperature_2m_mean,relative_humidity_2m_mean,weather_code,precipitation_sum,wind_speed_10m_max&forecast_days=10&timezone=auto`
    );
    if (!weatherResponse.ok) {
      throw new Error("Failed to fetch weather data");
    }
    const data = await weatherResponse.json();
    //here where data is converted to array
    const weatherList = data.daily.time.map((date, i) => {
      return {
        city: location.name,
        temperature:
          data.daily.temperature_2m_mean[i],
        humidity:
          data.daily.relative_humidity_2m_mean[i],
        date: date,
        windSpeed:
          data.daily.wind_speed_10m_max[i],
        condition:
          getCondition(data.daily.weather_code[i]),
        precipitation:
          data.daily.precipitation_sum[i]
      };
    });
    //delete and insert crud operations
    await WeatherModel.deleteMany({
      city: location.name
    });
    await WeatherModel.insertMany(weatherList);
    // Send response
    res.status(200).json({
      success: true,
      message: "Weather data fetched and saved",
      city: location.name,
      data: weatherList
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// ai prediction using gemini as llm
WeatherRoute.post("/weather/predict", async (req, res) => {
  try {
    const { city } = req.body;
    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: "City is required"
      });
    }
    const cityName = city.trim();// string cleam operation for safer execution
    const records = await WeatherModel.find({
      city: { $regex: `^${cityName}$`,  $options: "i"}
    }).lean();
    if (!records.length) {
      return res.status(404).json({
        success: false,
        message:
          "Weather data not found. Search for the city first."
      });
    }
    //using an apikey generated from google ai studio
    if (
      !GEMINI_API_KEY ||
      GEMINI_API_KEY === "MENTION THE API KEY GENERATED FROM STUDIO TO PERFORM"
    ) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is not configured"
      });
    }
//prompt
    const weatherInformation = records.map((record) => ({
      date: record.date,
      temperature: record.temperature,
      humidity: record.humidity,
      windSpeed: record.windSpeed,
      condition: record.condition,
      precipitation: record.precipitation
    }));
const prompt = `You are an AI weather prediction assistant.Analyze the following weather data for ${cityName}:${JSON.stringify(weatherInformation, null, 2)}Provide a simple prediction for the next day.
Include:
1. Expected temperature
2. Expected weather condition
3. Rain probability
4. Expected humidity
5. Expected wind speed
6. Short weather summary
Clearly mention that this is an AI-generated prediction and
not an official weather forecast.`;
//calling api
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{parts: [{text: prompt}]}]
        })
      }
    );
    const aiData = await aiResponse.json();
//error handling of the response of llm
    if (!aiResponse.ok) {
      console.error("Gemini API error:", aiData);
      return res.status(aiResponse.status).json({
        success: false,
        message: "Gemini API error",
        error: aiData
      });
    }
    const prediction =aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!prediction) {
      return res.status(500).json({
        success: false,
        message: "No prediction was returned by Gemini"
      });
    }
    res.status(200).json({
      success: true,
      message: "Prediction ready",
      city: cityName,
      data: prediction
    });
  } catch (err) {
    console.error("Prediction error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
//router to be exported to maintain modularity and scalability.
export default WeatherRoute;