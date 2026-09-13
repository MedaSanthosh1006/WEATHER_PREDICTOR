const cityInput = document.querySelector("input");
const searchButton = document.querySelector(".search button");

searchButton.addEventListener("click", async function () {

    const city = cityInput.value.trim();

    if (city === "") {
        alert("Please enter a city name");
        return;
    }

    try {

        const response = await fetch(
            "/api/weather/" + encodeURIComponent(city)
        );

        const result = await response.json();

        if (!result.success) {
            alert(result.message || "Unable to get weather");
            return;
        }

        displayWeather(result.data);

    } catch (error) {

        console.log(error);
        alert("Cannot connect to backend");

    }
});


function displayWeather(data) {

    if (!data || data.length === 0) {
        alert("No weather data found");
        return;
    }

    const current = data[0];

    document.querySelector(".box h3").textContent = current.city;

    const currentBox = document.querySelector(".box");

    currentBox.innerHTML = `
        <h2>Current Weather</h2>

        <h3>${current.city}</h3>

        <p>Temperature: ${current.temperature} °C</p>

        <p>Humidity: ${current.humidity}%</p>

        <p>Wind Speed: ${current.windSpeed} km/h</p>

        <p>Condition: ${current.condition}</p>

        <p>Precipitation: ${current.precipitation} mm</p>
    `;

    const tableBox = document.querySelectorAll(".box")[1];

    let rows = "";

    data.forEach(function (item) {

        rows += `
            <tr>
                <td>${item.date}</td>
                <td>${item.temperature} °C</td>
                <td>${item.humidity}%</td>
                <td>${item.windSpeed} km/h</td>
                <td>${item.condition}</td>
                <td>${item.precipitation} mm</td>
            </tr>
        `;

    });

    tableBox.innerHTML = `
        <h2>10-Day Weather</h2>

        <table>

            <tr>
                <th>Date</th>
                <th>Temperature</th>
                <th>Humidity</th>
                <th>Wind Speed</th>
                <th>Condition</th>
                <th>Precipitation</th>
            </tr>

            ${rows}

        </table>
    `;
}