import express from "express";
import mongoose from "mongoose";
import WeatherRoute from "./weather.js";
const app = express();
app.use(express.json());
// static is used to directly serve to users without changing them
app.use(express.static("../client"));//.. represents the parent directory
app.use("/api", WeatherRoute);// api required for weather
//establishing mongodb connection 
mongoose.connect("mongodb://127.0.0.1:27017/weather_db")
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err.message);
  });
//server is allocated with a port number
app.listen(5000, () => {
  console.log("Server running on port 5000");
});