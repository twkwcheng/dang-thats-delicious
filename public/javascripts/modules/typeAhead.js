import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
  return stores.map(store => `
      <a href="/store/${store.slug}" class="search__result">
        <strong>${store.name}</strong>
      </a>
    `).join('');
}

function typeAhead(search) {
  // console.log(search);
  if (!search) return;
  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  // console.log(searchInput, searchResults);
  // eslint-disable-next-line func-names
  searchInput.on('input', function () {
    // console.log(this.value);
    // 如果沒有輸入資料則離開
    if (!this.value) {
      searchResults.style.display = 'none';
      return;
    }
    // 顯示查詢結果
    searchResults.style.display = 'block';
    // searchResults.innerHTML = '';
    axios
      .get(`/api/search?q=${this.value}`)
      .then((res) => {
        // console.log(res.data);
        if (res.data.length) {
          // console.log('There is something to show!');
          // const html = searchResultsHTML(res.data);
          // console.log(html);
          searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
          // return;
        } else {
          // 顯示查詢結果沒有資料
          searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for ${this.value} found!</div>`);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  });

  // 處理鍵盤輸入
  searchInput.on('keyup', (e) => {
    // if they aren't pressing up, down or enter, who cares!
    if (![38, 40, 13].includes(e.keyCode)) {
      return; // nah
    }
    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;
    if (e.keyCode === 40 && current) {
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) {
      // eslint-disable-next-line prefer-destructuring
      next = items[0];
    } else if (e.keyCode === 38 && current) {
      next = current.previousElementSibling || items[items.length - 1]
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
    } else if (e.keyCode === 13 && current.href) {
      window.location = current.href;
      return;
    }
    if (current) {
      current.classList.remove(activeClass);
    }
    next.classList.add(activeClass);
  });
}

export default typeAhead;
