var map;

$(window).resize(function () {
    sizeLayerControl();
});

$("#list-btn").click(function () {
    animateSidebar();
    return false;
});

$("#nav-btn").click(function () {
    $(".navbar-collapse").collapse("toggle");
    return false;
});

$("#sidebar-toggle-btn").click(function () {
    animateSidebar();
    return false;
});

$("#sidebar-hide-btn").click(function () {
    animateSidebar();
    return false;
});

function animateSidebar() {
    $("#sidebar").animate({
        width: "toggle"
    }, 350, function () {
        map.invalidateSize();
    });
}

function sizeLayerControl() {
    $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
}

/*function sidebarClick(id) {
  var layer = markerClusters.getLayer(id);
  map.setView([layer.getLatLng().lat, layer.getLatLng().lng], 17);
  layer.fire("click");
  // Hide sidebar and go to the map on small screens
  if (document.body.clientWidth <= 767) {
    $("#sidebar").hide();
    map.invalidateSize();
  }
}*/

/* Basemap Layers */
var cartoLight = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>'
});
var usgsImagery = L.layerGroup([L.tileLayer("http://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 15,
}), L.tileLayer.wms("http://raster.nationalmap.gov/arcgis/services/Orthoimagery/USGS_EROS_Ortho_SCALE/ImageServer/WMSServer?", {
    minZoom: 16,
    maxZoom: 19,
    layers: "0",
    format: 'image/jpeg',
    transparent: true,
    attribution: "Aerial Imagery courtesy USGS"
})]);


map = L.map("map", {
    zoom: 14,
    center: [39.47, -0.37],
    layers: [cartoLight],
    zoomControl: false,
    attributionControl: false
});

/* Attribution control */
function updateAttribution(e) {
    $.each(map._layers, function (index, layer) {
        if (layer.getAttribution) {
            $("#attribution").html((layer.getAttribution()));
        }
    });
}

map.on("layeradd", updateAttribution);
map.on("layerremove", updateAttribution);

var attributionControl = L.control({
    position: "bottomright"
});
attributionControl.onAdd = function (map) {
    var div = L.DomUtil.create("div", "leaflet-control-attribution");
    div.innerHTML = "<span class='hidden-xs'>Developed by <a href='http://gti-ia.upv.es'>GTI-IA</a></span>";
    return div;
};
map.addControl(attributionControl);

var zoomControl = L.control.zoom({
    position: "bottomright"
}).addTo(map);

/* Larger screens get expanded layer control and visible sidebar */
if (document.body.clientWidth <= 767) {
    var isCollapsed = true;
} else {
    var isCollapsed = false;
}

var baseLayers = {
    "Street Map": cartoLight,
    "Aerial Imagery": usgsImagery
};


var layerControl = L.control.groupedLayers(baseLayers, {
    collapsed: isCollapsed
}).addTo(map);

$("#featureModal").on("hidden.bs.modal", function (e) {
    $(document).on("mouseout", ".feature-row", clearHighlight);
});


// Leaflet patch to make layer control scrollable on touch browsers
var container = $(".leaflet-control-layers")[0];
if (!L.Browser.touch) {
    L.DomEvent
        .disableClickPropagation(container)
        .disableScrollPropagation(container);
} else {
    L.DomEvent.disableClickPropagation(container);
}

/************/

var taxiIcon = L.icon({
    iconUrl: 'assets/img/taxi.png',

    iconSize: [38, 55], // size of the icon
    //iconAnchor: [22, 94], // point of the icon which will correspond to marker's location
    //popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

$("#generate-btn").on("click", function (e) {
    $.getJSON("/generate", function (data) {
    })
});

$("#move-btn").on("click", function (e) {
    $.getJSON("/move", function (data) {
    })
});


var taxis = {};
var paths = {};

var intervalID = setInterval(function () {
    $.getJSON("/entities", function (data) {
        var count = data.taxis.length;
        for (var i = 0; i < count; i++) {
            var taxi = data.taxis[i];
            if (taxi.id in taxis) {
                var localtaxi = taxis[taxi.id];
                updateTaxi(taxi);
            }
            else {
                console.log("Creating marker with position " + taxi.position);
                var marker = L.animatedMarker([taxi.position], {
                    icon: taxiIcon,
                    //destinations: [{latLng: taxi.position}]
                });
                //marker.addTo(map);
                map.addLayer(marker);
                taxi.marker = marker;
                taxis[taxi.id] = taxi;
                if (taxi.dest && taxi.path) {
                    updateTaxi(taxi);
                }
            }
        }
    });
}, 1000);

/**********************************/
// Warn if overriding existing method
if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;
        }
        else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;
        }
    }
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});
/**********************************/

var updateTaxi = function (taxi) {
    var localtaxi = taxis[taxi.id];
    console.log("Updating taxi " + taxi.id);
    if (taxi.dest != null && !taxi.dest.equals(localtaxi.dest)) {
        localtaxi.path = taxi.path;
        localtaxi.dest = taxi.dest;
        //localtaxi.marker.destinations = taxi.destinations;
        var polyline = L.polyline(taxi.path, {color: 'blue'});
        polyline.addTo(map);
        map.removeLayer(localtaxi.marker);
        localtaxi.marker = L.animatedMarker(polyline.getLatLngs(), {
            icon: taxiIcon,
            autoStart: false,
            onEnd: function() {
                _polyline = paths[this];
                map.removeLayer(_polyline);
            }
        });
        map.addLayer(localtaxi.marker);
        localtaxi.marker.start();
        paths[localtaxi.marker] = polyline;
        localtaxi.marker.start();
        localtaxi.dest = taxi.dest;
    }
};
