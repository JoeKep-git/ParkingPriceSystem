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
            console.log(station.location.latitude);
            var location = new Microsoft.Maps.Location(station.location.latitude,station.location.longitude);
            var pin = new Microsoft.Maps.Pushpin(location);

            //Click event to pushpin
            Microsoft.Maps.Events.addHandler(pin, 'click', function () {
                infoBox.setOptions({
                    location: location,
                    title: station.name,
                    description: station.address
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
