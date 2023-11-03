async function getMap() {

    //telling user the map is loading
    var loading = document.createElement('h4');
    loading.innerText = "Loading Map";
    var title = document.getElementById('title');
    console.log(loading);
    title.appendChild(loading);

    var dots = 0;

    var intervalId = setInterval(function() {
        dots = (dots + 1) % 4; // Cycle through 0, 1, 2, 3

        loading.innerText = "Loading Map" + ".".repeat(dots);
    }, 500); // Flash every half second (500 milliseconds)

    //GET request for my /data route
    fetch('/data').then(response => response.json()).then(data => {
        //Initialize a map instance.
        var map = new Microsoft.Maps.Map('#map');
        var infoBox = new Microsoft.Maps.Infobox(map.getCenter(), {
            visible: false
        });

        //showing the search by postcode button and input
        document.getElementById('searchByPostcodeButton').style.display = 'inline';
        document.getElementById('radiusInput').style.display = 'inline';
        document.getElementById('postcodeInput').style.display = 'inline';

        map.entities.push(infoBox);

        data.forEach(station => {
            var location = new Microsoft.Maps.Location(station.location.latitude,station.location.longitude);

            //creating a div container to add the prices
            var priceContainer = document.createElement('div');
            //checking if prices are not empty
            if(station.prices.E5 !== undefined) {
                //adding to the price container for E5 price
                priceContainer.innerText += `E5: ${station.prices.E5}, `;
            }  
            if(station.prices.E10 !== undefined) {
                //adding to the price container for E10 price
                priceContainer.innerText += `E10: ${station.prices.E10}, `;
            }
            if(station.prices.B7 !== undefined) {
                //adding to the price container for B7 price
                priceContainer.innerText += `B7: ${station.prices.B7}`;
            }

            var pin = new Microsoft.Maps.Pushpin(location, {
                title: station.brand,
                subTitle: `Address: ${station.address},
                ${priceContainer.innerHTML}`,
                color: 'red'
            });

            //Click event to pushpin
            Microsoft.Maps.Events.addHandler(pin, 'click', function () {
                infoBox.setOptions({
                    location: location,
                    title: station.brand,
                    description: `
                           <div>
                               <br>Address: ${station.address}</br>
                               Postcode: ${station.postcode}</p>
                               <p>Prices:
                               ${priceContainer.innerHTML}
                               </p>
                               <button onclick="openDirections('${station.address}, ${station.postcode}')">Get Directions</button>
                           </div>
                       `,
                    visible: true
                });
                infoBox.setMap(map)
            });
            map.entities.push(pin);
        });

        //removing loading message
        loading.remove();
    }).catch(err => /*loading.innerHTML = 'Server Error loading map',*/ console.error('Error at: ', err));
}

async function getMapPostCode(centerLat, centerLon, radius) {

    //telling user the map is loading
    var loading = document.createElement('h4');
    loading.innerText = "Loading Map";
    var title = document.getElementById('title');
    console.log(loading);
    title.appendChild(loading);

    var dots = 0;

    var intervalId = setInterval(function() {
        dots = (dots + 1) % 4; // Cycle through 0, 1, 2, 3

        loading.innerText = "Loading Map" + ".".repeat(dots);
    }, 500); // Flash every half second (500 milliseconds)

    //GET request for my /data route
    fetch('/data').then(response => response.json()).then(data => {
        // Filter points within the specified radius
        const pointsWithinRadius = findPointsWithinRadius(centerLat, centerLon, radius, data);

        //Initialize a map instance.
        var map = new Microsoft.Maps.Map('#map');
        var infoBox = new Microsoft.Maps.Infobox(map.getCenter(), {
            visible: false
        });
        map.entities.push(infoBox);

        pointsWithinRadius.forEach(station => {
            var location = new Microsoft.Maps.Location(station.location.latitude,station.location.longitude);

            //creating a div container to add the prices
            var priceContainer = document.createElement('div');
            //checking if prices are not empty
            if(station.prices.E5 !== undefined) {
                //adding to the price container for E5 price
                priceContainer.innerText += `E5: ${station.prices.E5}, `;
            }  
            if(station.prices.E10 !== undefined) {
                //adding to the price container for E10 price
                priceContainer.innerText += `E10: ${station.prices.E10}, `;
            }
            if(station.prices.B7 !== undefined) {
                //adding to the price container for B7 price
                priceContainer.innerText += `B7: ${station.prices.B7}`;
            }

            var pin = new Microsoft.Maps.Pushpin(location, {
                title: station.brand,
                subTitle: `Address: ${station.address},
                ${priceContainer.innerHTML}`,
                color: 'red'
            });

            //Click event to pushpin
            Microsoft.Maps.Events.addHandler(pin, 'click', function () {
                infoBox.setOptions({
                    location: location,
                    title: station.brand,
                    description: `
                           <div>
                               <br>Address: ${station.address}</br>
                               Postcode: ${station.postcode}</p>
                               <p>Prices:
                               ${priceContainer.innerHTML}
                               </p>
                               <button onclick="openDirections('${station.address}')">Get Directions</button>
                           </div>
                       `,
                    visible: true
                });
                infoBox.setMap(map)
            });
            map.entities.push(pin);
        });

        //removing loading message
        loading.remove();
    }).catch(err => loading.innerHTML = 'Server Error loading map' && console.error('Error at: ', err));
}
/**********************Calculating the long and lat of postcode and radius*************************** */

function searchByPostcode() {
    var postcode = document.getElementById('postcodeInput').value;
    var radius = parseFloat(document.getElementById('radiusInput').value);

    fetch('/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ postcode, radius })
    })
    .then(response => {
        if (!response.ok) {
            //returning the error message from the server with a rejected promise causing and error to be thrown
            return response.json().then(errorData => Promise.reject(errorData.error));
        }
        return response.json();
    })
    .then(data => {
        const { centerLat, centerLon, radius } = data;
        getMapPostCode(centerLat, centerLon, radius);
    })
    .catch(error => {
        console.error('Error:', error),
        alert('An error occurred ' + error);    
    });
}


// This function calculates the distance between two points on the Earth's surface using the Haversine formula.
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers

    // Convert latitude and longitude from degrees to radians
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    // Haversine formula to calculate the great-circle distance
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    /** 
     * used to calculate the distance between two points on the surface of a sphere, 
     * such as the Earth. In this case, it is specifically 
     * used to find the great-circle distance, which is the shortest 
     * distance between two points on the surface of a sphere
    */

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Calculate the distance in kilometers
    const distance = R * c;

    return distance; // Return the distance between the two points
}

// This function finds points within a certain radius from a given center point.
function findPointsWithinRadius(centerLat, centerLon, radius, points) {
    const result = []; // Initialize an empty array to store the points within the radius

    // Iterate through each point in the 'points' array
    for (const point of points) {
        // Calculate the distance between the center point and the current point
        const distance = calculateDistance(centerLat, centerLon, point.location.latitude, point.location.longitude);

        // Check if the distance is less than or equal to the specified radius
        if (distance <= radius) {
            result.push(point); // If so, add the point to the result array
        }
    }

    return result; // Return the array of points within the radius
}

/****************************End******************************************************************* */

//open directions
function openDirections(address) {
    // Use the Bing Maps API to open directions
    navigator.geolocation.getCurrentPosition(function(position) {
        var url = `https://www.bing.com/maps?rtp=pos.${position.coords.latitude}_${position.coords.longitude}~pos.${encodeURIComponent(address)}&key=ApXX9iOE9c3LpsdUBeX9eiWaaPhbdEpSzlAM3uwFsspQocDgyW1eE9xXFyYZlfmM`;
        window.open(url, '_blank');
    });
}