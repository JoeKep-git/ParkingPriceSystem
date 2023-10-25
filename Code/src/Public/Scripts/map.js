let map;

function getMap() {
    //Initialize a map instance.
    var map = new Microsoft.Maps.Map('#map');
    var infoBox = new Microsoft.Maps.Infobox(map.getCenter(), {
        visible: false
    });

    map.entities.push(infoBox);

    //GET request for my /data route
    fetch('/data').then(response => response.json()).then(data => {
        data.forEach(station => {
            console.log(station);
            console.log(station.prices);
            var location = new Microsoft.Maps.Location(station.location.latitude,station.location.longitude);

            //creating a div container to add the prices
            var priceContainer = document.createElement('div');
            //checking if prices are not empty
            if(station.prices.E5 !== undefined) {
                //creating a paragraph for E5 price
                // var e5 = document.createElement('p');
                priceContainer.innerText += `E5: ${station.prices.E5}, `;
                // priceContainer.appendChild(e5);
            }  
            if(station.prices.E10 !== undefined) {
                //creating a paragraph for E10 price
                // var e10 = document.createElement('p');
                priceContainer.innerText += `E10: ${station.prices.E10}, `;
                // priceContainer.appendChild(e10);
            }
            if(station.prices.B7 !== undefined) {
                //creating a paragraph for B7 price
                // var b7 = document.createElement('p');
                priceContainer.innerText += `B7: ${station.prices.B7}`;
                // priceContainer.appendChild(b7);
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
                           </div>
                       `,
                    visible: true
                });
                infoBox.setMap(map)
            });
            map.entities.push(pin);
        });
    }).catch(err => console.error('Error at: ', err));
}
