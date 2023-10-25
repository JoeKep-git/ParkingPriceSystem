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
            var pin = new Microsoft.Maps.Pushpin(location, {
                title: station.brand,
                subTitle: `Address: ${station.address},
                E5:${station.prices.E5}, E10:${station.prices.E10}, B7:${station.prices.B7},`,
                color: 'red'
            });

            //Click event to pushpin
            Microsoft.Maps.Events.addHandler(pin, 'click', function () {
                infoBox.setOptions({
                    location: location,
                    title: station.brand,
                    description: station.address,
                    price: station.price,
                });
                infoBox.setMap(map)
            });
            map.entities.push(pin);
        });
    }).catch(err => console.error('Error at: ', err));

    // //Add a clickable spot
    // const pushpin = new Microsoft.Maps.Pushpin(map.getCenter(), {
    //     title: 'Clickable Spot',
    //     subTitle: 'This spot is clickable',
    //     color: 'red'
    // });

    // Microsoft.Maps.Events.addHandler(pushpin, 'click', function () {
    //     alert('Clicked pushpin');
    // });

    // map.entities.push(pushpin);
}
