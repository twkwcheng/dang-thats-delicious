function autocomplete(input, latInput, lngInput) {
  // console.log(input, latInput, lngInput);
  // 如果沒有輸入資料則結束
  if (!input) return;
  const dropdown = new google.maps.places.Autocomplete(input);
  dropdown.addListener('place_changed', () => {
    const place = dropdown.getPlace();
    // console.log(place);
    latInput.value = place.geometry.location.lat();
    lngInput.value = place.geometry.location.lng();
  });
  // 按下 enter 按鈕不要直接送出表單
  input.on('keydown', (e) => {
    if (e.keyCode === 13) e.preventDefault();
  });
}

export default autocomplete;
