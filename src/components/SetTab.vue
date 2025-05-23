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
      <label>No. POS</label>
      <input class="form-control" type="number" name="pos" id="pos" required v-model="setup.pos" :disabled="!isSetupEditable">
      <label>No. DWL</label>
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
    </form>
    <br>
    <div class="form-group">
      <button class="btn btn-primary m-1" id="btn_unduh_local" style="margin-right: 2px" :disabled="!canUnduhLocal" @click="$emit('trigger-unduh-local')">Unduh File</button>
      <!-- <button class="btn btn-warning m-1" id="btn_unggah" :disabled="!canUnggah" @click="$emit('trigger-unggah')">Sync File M</button> -->
      <button class="btn btn-success m-1" id="btn_unduh" style="margin-right: 2px" :disabled="!canUpdate" @click="$emit('trigger-update')">Perbarui Data</button>
    </div><br>
    <section id="records" class="text-right text-danger">Records : {{ recordsCount }}</section>
  </div>
</template>

<script>
import moment from 'moment';
import 'daterangepicker';
import '../assets/css/daterangepicker.css';

export default {
  name: 'SetTab',
  props: ['initialSetupData', 'online', 'alreadyInitialized', 'recordsCount'],
  data() {
    return {
      setup: { ...this.initialSetupData || {} },
      dateInput: null
    };
  },
  computed: {
    isSetupEditable() {
      return !this.alreadyInitialized;
    },
    canUnduhLocal() {
      return this.alreadyInitialized;
    },
    canUnggah() {
      return this.online && this.alreadyInitialized;
    },
    canUpdate() {
      return this.online && !this.alreadyInitialized;
    }
  },
  watch: {
    initialSetupData: {
      handler(newVal) {
        this.setup = newVal ? { ...newVal } : {};
      },
      deep: true,
      immediate: true,
    },
    setup: {
      handler(newVal) {
        for (const key in newVal) {
            this.$emit('update-setup', { [key]: newVal[key] });
        }
      },
      deep: true,
    },
  },
  methods: {
    initDatepicker() {
        this.dateInput = window.$(this.$el).find('input[name="date"]');
        if (this.dateInput.data('daterangepicker')) {
          this.dateInput.data('daterangepicker').remove();
        }
        this.dateInput.daterangepicker({
          format: 'DD/MM/YYYY',
          singleDatePicker: true,
          showDropdowns: false, 
          autoApply: true,
          minDate: moment(), 
          locale: { format: 'DD/MM/YYYY' }
        });
      }
  },
  mounted() {
    if (!this.setup.date) {
      this.setup.date = moment().format('DD/MM/YYYY');
    }
    this.initDatepicker();
  },
  beforeUnmount() {
    if (this.dateInput.data('daterangepicker')) {
      this.dateInput.data('daterangepicker').remove();
    }
  }
};
</script>