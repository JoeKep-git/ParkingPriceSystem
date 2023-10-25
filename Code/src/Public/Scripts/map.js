let map;

function getMap() {
    map = new Microsoft.Maps.Map('#map', {
        center: new Microsoft.Maps.Location(51.5074, 0.1272),
        zoom: 10
    });

    //Add a clickable spot
    const pushpin = new Microsoft.Maps.Pushpin(map.getCenter(), {
        title: 'Clickable Spot',
        subTitle: 'This spot is clickable',
        color: 'red'
    });

    Microsoft.Maps.Events.addHandler(pushpin, 'click', function () {
        alert('Clicked pushpin');
    });

    map.entities.push(pushpin);
}
