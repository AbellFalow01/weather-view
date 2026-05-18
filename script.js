const API_KEY = '98975d41281c4e0baedbafcf5b2ce65d';

var Imperial = {
    wind_speed_unit: "mph",
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
}

var Metric = {
    wind_speed_unit: "kmh",
    temperature_unit: "celsius",
    precipitation_unit: "mm"
}

let currentCoordinates;
let currentCityCountry ;

if (!sessionStorage.getItem('settings')) {
    sessionStorage.setItem('settings', JSON.stringify(Imperial));
}

const lightDarkCheckbox = document.querySelector('#lightDarkCheckbox');
lightDarkCheckbox.addEventListener("click", () => {
    const root = document.documentElement;
    if (lightDarkCheckbox.checked) {
        root.classList.add('light')
    } else if (!lightDarkCheckbox.checked) {
        root.classList.remove('light')
    }
})

const dropdowns = document.querySelectorAll('.dropdown');

dropdowns.forEach(dropdown => {
    const select = dropdown.querySelector('.select');
    const caret = dropdown.querySelector('.caret');
    const menu = dropdown.querySelector('.menu');
    const options = dropdown.querySelectorAll('.menu li');
    const selected = dropdown.querySelector('.selected');

    select.addEventListener("click", () => {
        caret.classList.toggle('caret-rotate')
        menu.classList.toggle('menu-open')
    })

    options.forEach(option => {
        option.addEventListener("click", () => {
            selected.innerText = option.innerText;
            caret.classList.remove('caret-rotate')
            menu.classList.remove('menu-open')

            if (selected.innerText === "Imperial") {
                sessionStorage.setItem("settings", JSON.stringify(Imperial))
                reloadWeather();
            }
            if (selected.innerText === "Metric") {
                sessionStorage.setItem("settings", JSON.stringify(Metric))
                reloadWeather();
            }
            
            options.forEach(option => {
                option.classList.remove('active')
            });
            option.classList.add('active')
        });
    });
});

const getDate = () => {

    // Returns [ "Thu", "May", "14", "2026"]
    const date = new Date();
    const day = date.getDay();
    const dateString = String(date);
    const words = dateString.split(" ");
    words.splice(4, 8);
    words.splice(0, 1)
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    words.push(dayNames[day]);


    // Returns short day seven days forward
    const shortDay = [];
    let c = 0;
    for(i = 0; i < 7; i++) {
        date.setDate(date.getDate() + c);
        const dayBefore = String(date);
        const day = dayBefore.split(" ")[0];
        shortDay.push(day);
        c = 1;
    }

    // Returns ampm time
    const hours = []
    date.setHours(date.getHours())
    let hour = date.getHours()
    for(i = 0; i < 8; i++) {
        hour = hour % 12;
        hour = hour ? hour : 12;
        let ampm = hour >= 12 ? "PM" : "AM";
        hours.push(hour + " " + ampm)
        hour++;
    }

    // returns MetricTime
    const metricHours = []
    var d = new Date;
    d.setHours(d.getHours())
    let hourBefore = d.toString()
    let part = hourBefore.substring(16, 18);
    let c2 = 0;
    for(i = 0; i < 8; i++) {
    d.setHours(d.getHours() + c2)
    let hourBefore = d.toString()
    let part = hourBefore.substring(16, 18);
    c2 = 1
    part = part + ":00"
    metricHours.push(part);

    }

    return {
        currentDate: `${words[3]}, ${words[0]} ${words[1]}, ${words[2]}`,
        shortDay,
        hours,
        metricHours
    }

}

const getCurrentLocation = async () => {
    try {
        const response = await axios.get(`https://api.geoapify.com/v1/ipinfo?apiKey=${API_KEY}`);
        return response.data.state.name;
    } catch (error) {
        console.log(error)
    }
}

const getCoordinates = async (searchInput) => {
    try {
        const response = await axios.get('https://geocoding-api.open-meteo.com/v1/search?name=' + searchInput);
        let latitude = response.data.results[0].latitude;
        let longitude = response.data.results[0].longitude;
        return {
            latitude,
            longitude
        }
    } catch (error) {
        console.log(error);
    }
}

const getCityCountry = async (coordinates) => {
    try {
        const response = await axios.get(`https://api.geoapify.com/v1/geocode/reverse?lat=${coordinates.latitude}&lon=${coordinates.longitude}&format=json&type=city&apiKey=${API_KEY}`);
        return `${response.data.results[0].address_line1}, ${response.data.results[0].country}`
    } catch (error) {
        console.log(error)
    }
}

const getWeather = async (coordinates) => {
    const measurementSystem = JSON.parse(sessionStorage.getItem('settings'));
    const url = `
    https://api.open-meteo.com/v1/forecast
    ?latitude=${coordinates.latitude}
    &longitude=${coordinates.longitude}
    &daily=temperature_2m_max,temperature_2m_min,weather_code
    &hourly=temperature_2m,weather_code
    &forecast_days=7
    &forecast_hours=8
    &current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation
    &timezone=auto
    &wind_speed_unit=${measurementSystem.wind_speed_unit}
    &temperature_unit=${measurementSystem.temperature_unit}
    &precipitation_unit=${measurementSystem.precipitation_unit}
    `.replace(/\s/g, "");

    try {
        const response = await axios.get(url);
        return {
            current: {
                temperature_2m: response.data.current.temperature_2m,
                apparent_temperature: response.data.current.apparent_temperature,
                relative_humidity_2m: response.data.current.relative_humidity_2m,
                wind_speed_10m: response.data.current.wind_speed_10m,
                precipitation: response.data.current.precipitation
            },
            daily: {
                temperature_2m_max: response.data.daily.temperature_2m_max,
                temperature_2m_min: response.data.daily.temperature_2m_min,
                weather_code: response.data.daily.weather_code
            },
            hourly: {
                temperature_2m: response.data.hourly.temperature_2m,
                weather_code: response.data.hourly.weather_code
            }
        }
    } catch (error) {
        console.log(error);
    }

}

const updatePage = async (weatherInfo, cityCountry) => {
    const measurementSystem = JSON.parse(sessionStorage.getItem('settings'));
    const date = getDate();
    document.querySelector('#currentTemp').innerText = `${Math.round(weatherInfo.current.temperature_2m)}°`;
    document.querySelector('#feelsLike').innerText = `${Math.round(weatherInfo.current.apparent_temperature)}°`;
    document.querySelector('#humidity').innerText = `${Math.round(weatherInfo.current.relative_humidity_2m)}%`;
    if (measurementSystem.temperature_unit === "fahrenheit") {
        document.querySelector('#wind').innerText = `${Math.round(weatherInfo.current.wind_speed_10m)} mph`;
        document.querySelector('#precipitation').innerText = `${Math.round(weatherInfo.current.precipitation)} inches`;
    } else if (measurementSystem.temperature_unit === "celsius") {
        document.querySelector('#wind').innerText = `${Math.round(weatherInfo.current.wind_speed_10m)} km/h`;
        document.querySelector('#precipitation').innerText = `${Math.round(weatherInfo.current.precipitation)} mm`;
    }
    document.querySelector('#currentDate').innerText = `${date.currentDate}`
    document.querySelector('#cityCountry').innerText = `${cityCountry}`
    document.querySelector('#currentImage').src = `${getWeatherImage(weatherInfo.hourly.weather_code[0])}`;
    const bottomBox = document.querySelector('.bottom-box');
    bottomBox.innerHTML = "";
    for(i = 0; i < 7; i++) {
        let imageUrl = getWeatherImage(weatherInfo.daily.weather_code[i])
        bottomBox.innerHTML += `
        <div>
            <p>${date.shortDay[i]}</p>
            <img src="${imageUrl}" alt="">
            <div>
                <p>${Math.round(weatherInfo.daily.temperature_2m_max[i])}°</p>
                <p>${Math.round(weatherInfo.daily.temperature_2m_min[i])}°</p>
            </div>
        </div>
        `
    }

    const rightBox = document.querySelector('.right-box');
    rightBox.innerHTML = "";
    for(i = 0; i < 8; i++) {
        let imageUrl = getWeatherImage(weatherInfo.hourly.weather_code[i])
        if (measurementSystem.temperature_unit === "fahrenheit") {
        rightBox.innerHTML += `
        <div>
            <div>
                <img src="${imageUrl}" alt="">
                <p>${date.hours[i]}</p>
            </div>
        <p>${Math.round(weatherInfo.hourly.temperature_2m[i])}°</p>
        </div>
        `
        } else if (measurementSystem.temperature_unit === "celsius") {
            rightBox.innerHTML += `
            <div>
                <div>
                    <img src="${imageUrl}" alt="">
                    <p>${date.metricHours[i]}</p>
                </div>
            <p>${Math.round(weatherInfo.hourly.temperature_2m[i])}°</p>
            </div>
            `
        }
    }
}

const getWeatherImage = (weatherCode) => {
    let imageUrl = "";
    switch (weatherCode) {
    case 0:
        imageUrl = "icons/clear.png";
        break;
    case 1:
        imageUrl = "icons/mainly-clear.png";
        break;
    case 2:
        imageUrl = "icons/partly-cloudy.png";
        break;
    case 3:
        imageUrl = "icons/overcast.png";
        break;
    case 45:
        imageUrl = "icons/fog.png";
        break;
    case 48:
        imageUrl = "icons/icy-fog.png";
        break;
    case 51:
        imageUrl = "icons/light-drizzle.png";
        break;
    case 53:
        imageUrl = "icons/drizzle.png";
        break;
    case 55:
        imageUrl = "icons/heavy-drizzle.png";
        break;
    case 56:
        imageUrl = "icons/light-freezing-drizzle.png";
        break;
    case 57:
        imageUrl = "icons/freezing-drizzle.png";
        break;
    case 61:
        imageUrl = "icons/light-showers.png";
        break;
    case 63:
        imageUrl = "icons/showers.png";
        break;
    case 65:
        imageUrl = "icons/heavy-showers.png";
        break;
    case 66:
        imageUrl = "icons/light-freezing-rain.png";
        break;
    case 67:
        imageUrl = "icons/freezing-rain.png";
        break;
    case 71:
        imageUrl = "icons/light-snow-showers.png";
        break;
    case 73:
        imageUrl = "icons/snow.png";
        break;
    case 75:
        imageUrl = "icons/heavy-snow.png";
        break;
    case 77:
        imageUrl = "icons/snow-grains.png";
        break;
    case 80:
        imageUrl = "icons/light-showers.png";
        break;
    case 81:
        imageUrl = "icons/showers.png";
        break;
    case 82:
        imageUrl = "icons/heavy-showers.png";
        break;
    case 95:
        imageUrl = "icons/thunderstorm.png";
        break;
    case 96:
        imageUrl = "icons/thunderstorm-with-hail.png";
        break;
    case 99:
        imageUrl = "icons/thunderstorm-with-hail.png";
        break;
    default:
        imageUrl = "icons/fog.png";
    }
    return imageUrl;
}

const searchQuery = async () => {
    const searchInput = document.querySelector('#searchInput').value;
    currentCoordinates = await getCoordinates(searchInput);
    currentCityCountry = await getCityCountry(currentCoordinates);
    const weatherInfo = await getWeather(currentCoordinates);
    updatePage(weatherInfo, currentCityCountry);
}

const reloadWeather = async () => {
    if (!currentCoordinates) return;

    const weatherInfo = await getWeather(currentCoordinates);
    updatePage(weatherInfo, currentCityCountry);
}

const onLoad = async () => {
    const date = getDate();
    document.querySelector('#currentDate').innerText = `${date.currentDate}`;
    const currentLocation = await getCurrentLocation();
    currentCoordinates = await getCoordinates(currentLocation);
    currentCityCountry = await getCityCountry(currentCoordinates);
    const weatherInfo = await getWeather(currentCoordinates);
    updatePage(weatherInfo, currentCityCountry);
}

onLoad();
