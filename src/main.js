import { createApp } from 'vue'; 
import StockApp from './StockApp.vue';

// Import CSS
import './assets/css/bootstrap.min.css';
import './assets/css/font-awesome.min.css';
import './assets/css/sweetalert.css';

// Make jQuery global for daterangepicker if needed
import $ from 'jquery';
window.$ = window.jQuery = $;

const app = createApp(StockApp);
app.mount('#app'); 