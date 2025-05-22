<template>
  <div id="set">
    <form autocomplete="off" name="start">
      <label>Tanggal</label>
      <input class="form-control" type="text" name="date" id="date" v-model="setup.date" :disabled="!isSetupEditable">
      <label>Kode Toko</label>
      <input class="form-control" type="number" name="store" id="store" required v-model="setup.store" :disabled="!isSetupEditable">
      <label>Departement</label>
      <select class="form-control" id="dept" name="dept" v-model="setup.dept" :disabled="!isSetupEditable">
        <option value="96">96 - Produce</option>
        <option value="97">97 - Meat and Fish</option>
        <option value="92,39,99">92 39 - Food Service</option>
        <option value="33">33 - Loyalty</option>
        <option value="99">99 - Packaging</option>
        <option value="34,91,98">34 91 98 - GMS</option>
        <option value="61,69">61 69 - Dairy and Frozen</option>
        <option value="35,36,37,68">35 36 37 68 - Groceries</option>
        <option value="35,36,37,68,34,91,98,96,97,33,99">All Dept</option>
      </select>
      <label>Nomor POS</label>
      <input class="form-control" type="number" name="pos" id="pos" required v-model="setup.pos" :disabled="!isSetupEditable">
      <label>Nomor DWL</label>
      <select class="form-control" id="dwl" name="dwl" v-model="setup.dwl" :disabled="!isSetupEditable">
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
        <option value="6">6</option>
        <option value="7">7</option>
        <option value="8">8</option>
        <option value="9">9</option>
      </select>
      <input type="checkbox" class="custom-control-input" id="autoDown" value="1" v-model="setup.auto" :disabled="!isSetupEditable">
      <label class="custom-control-label">Unduh Otomatis</label>
      <small class="text-muted" id="info">*Jika diaktifkan, Unduh Otomatis dilakukan setiap 5 menit sekali dalam kondisi jaringan Online</small>
    </form>
    <br>
    <div class="form-group">
      <button class="btn btn-danger" id="btn_unduh_local" :disabled="!canUnduhLocal" @click="$emit('trigger-unduh-local')">Unduh Local</button>
      <button class="btn btn-warning" id="btn_unggah" :disabled="!canUnggah" @click="$emit('trigger-unggah')">Unduh File M</button>
      <button class="btn btn-success" id="btn_unduh" :disabled="!canUnduh" @click="$emit('trigger-update')">Perbarui Data</button>
    </div><br>
    <section id="records" class="text-right text-danger">Records : {{ recordsCount }}</section>
  </div>
</template>

<script>
import moment from 'moment';
import 'daterangepicker';
import '../assets/css/daterangepicker-bs3.css';


export default {
  name: 'SetTab',
  props: ['initialSetupData', 'online', 'alreadyInitialized', 'recordsCount'], // recordsCount sekarang adalah prop
  data() {
    return {
      setup: { ...this.initialSetupData },
      // recordsCount tidak lagi di sini karena menjadi prop
    };
  },
  computed: {
    isSetupEditable() {
      return !this.alreadyInitialized;
    },
    canUnduhLocal() {
      return this.online && this.alreadyInitialized;
    },
    canUnggah() {
      return this.online && this.alreadyInitialized;
    },
    canUnduh() {
      return this.online && !this.alreadyInitialized;
    }
  },
  watch: {
    initialSetupData: {
      handler(newVal) {
        this.setup = { ...newVal };
      },
      deep: true,
      immediate: true,
    },
    'setup.date': function(newDate) {
      if (newDate) {
        this.initDatepicker();
      }
    }
  },
  methods: {
    initDatepicker() {
      // Pastikan jQuery tersedia di scope ini jika tidak global di main.js
      window.$(this.$el).find('input[name="date"]').daterangepicker({
        format: 'DD/MM/YYYY',
        singleDatePicker: true,
        showDropdowns: false,
        startDate: this.setup.date ? moment(this.setup.date, 'DD/MM/YYYY') : moment(),
        minDate: moment(),
        locale: {
          format: 'DD/MM/YYYY'
        }
      }, (start) => {
        this.setup.date = start.format('DD/MM/YYYY');
        this.$emit('update-setup', { date: this.setup.date });
      });
    },
    // Metode updateRecordsCount dihapus karena recordsCount sekarang adalah prop
  },
  mounted() {
    this.initDatepicker();
    if (!this.setup.date) {
      this.setup.date = moment().format('DD/MM/YYYY');
      this.$emit('update-setup', { date: this.setup.date });
    }
  },
};
</script>