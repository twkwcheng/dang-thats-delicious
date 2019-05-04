import axios from 'axios';
import { $ } from './bling';

const mapOptions = {
  center: { lat: 43.2, lng: -79.8 },
  zoom: 10,
};

function loadPlaces(map, lat = 43.2, lng = -79.8) {
  axios
    .get(`/api/stores/near?lat=${lat}&lng=${lng}`)
    .then((res) => {
      const places = res.data;
      // console.log(places);
      if (!places.length) {
        // eslint-disable-next-line no-alert
        alert('no places found!');
        return;
      }
      // 設定 zoom 邊界
      const bounds = new google.maps.LatLngBounds();
      // google map info window
      const infoWindow = new google.maps.InfoWindow();
      const markers = places.map((place) => {
        const [placeLng, placeLat] = place.location.coordinates;
        // console.log(placeLng, placeLat);
        const position = { lat: placeLat, lng: placeLng };
        bounds.extend(position);
        const marker = new google.maps.Marker({ map, position });
        marker.place = place;
        return marker;
      });
      // console.log(markers);
      // 當點選 marker 時顯示該地點詳細資料
      // eslint-disable-next-line func-names
      markers.forEach(marker => marker.addListener('click', function() {
        console.log(this.place);
        const html = `
          <div class="popup">
            <a href="/store/${this.place.slug}">
              <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
              <p>${this.place.name} - ${this.place.location.address}</p>
            </a>
          </div>
        `;
        // infoWindow.setContent(this.place.name);
        infoWindow.setContent(html);
        infoWindow.open(map, this);
      }));
      // zoom in 地圖
      map.setCenter(bounds.getCenter());
      map.fitBounds(bounds);
    });
}

function makeMap(mapDiv) {
  // console.log(mapDiv);
  if (!mapDiv) return;
  // 製作地圖
  const map = new google.maps.Map(mapDiv, mapOptions);
  loadPlaces(map);
  const input = $('[name="geolocate"]');
  // console.log(input);
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    // console.log(place);
    loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
  });
}

export default makeMap;
