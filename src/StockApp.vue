<template>
  <div id="app">
    <div id="camcontainer" :style="{ display: camContainerDisplay }" style="width:100%; height: 100vh; position: fixed; left: 0; top: 0; background-color: rgba(0, 0, 0, 0.8); z-index: 1000;">
      <div id="reader" style="width:100%;"></div>
      <span class="btn btn-danger" id="close_cam" style="margin: 5px" @click="stopCam">Tutup</span>
    </div>

    <div class="spinner-border" role="status" v-if="loading">
      <span class="sr-only">Loading...</span>
    </div>

    <div id="direct"></div>
    <div class="container">
      <section class="content-header">
        <h3><span class="glyphicon glyphicon-phone"></span> Droid Stock SA <small class="text-muted" id="info">{{ appVersion }}</small>
          <br/>
          <span id="stat" :class="onlineStatusClass">{{ onlineStatusText }}</span>
          </h3>
      </section>

      <ul class="nav nav-tabs">
        <li class="nav-item" :class="{ 'active': activeTab === 'scan' }">
          <a class="nav-link" href="#" @click="setActiveTab('scan')"><span class='glyphicon glyphicon-barcode'></span> Pindai</a>
        </li>
        <li class="nav-item" :class="{ 'active': activeTab === 'view' }">
          <a class="nav-link" href="#" @click="setActiveTab('view')"><span class='glyphicon glyphicon-book'></span> Lihat</a>
        </li>
        <li class="nav-item" :class="{ 'active': activeTab === 'set' }">
          <a class="nav-link" href="#" @click="setActiveTab('set')"><span class='glyphicon glyphicon-cog'></span> Atur</a>
        </li>
        <li class="nav-item" :class="{ 'active': activeTab === 'purge' }">
          <a class="nav-link" href="#" @click="setActiveTab('purge')"><span class='glyphicon glyphicon-trash'></span> Hapus</a>
        </li>
        <li class="nav-item" :class="{ 'active': activeTab === 'backup' }">
          <a class="nav-link" href="#" @click="setActiveTab('backup')"><span class='glyphicon glyphicon-save-file'></span> Riwayat</a>
        </li>
      </ul>

      <div class="tab-content">
        <div v-if="activeTab === 'backup'">
          <BackupTab ref="backupTab" @push-backup="pushBackup" />
        </div>
        <div v-if="activeTab === 'scan'">
          <ScanTab
            ref="scanTab"
            :setup-data="setupData"
            @update-records="records"
            @start-cam="startCam"
            @start-scanner="startScanner"
          />
        </div>
        <div v-if="activeTab === 'view'">
          <ViewTab ref="viewTab" />
        </div>
        <div v-if="activeTab === 'set'">
          <SetTab
            ref="setTab"
            :initial-setup-data="initSetup"
            :online="online"
            :already-initialized="alreadyInitialized"
            :records-count="recordsCount"
            @update-setup="updateSetupData"
            @trigger-update="update"
            @trigger-unduh-local="unduhLocal"
            @trigger-unggah="unggah"
          />
        </div>
        <div v-if="activeTab === 'purge'">
          <PurgeTab :online="online" @trigger-hapus="hapusData" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import moment from 'moment';
import Swal from 'sweetalert';
import { Html5Qrcode } from 'html5-qrcode';

PouchDB.plugin(PouchDBFind);

import ScanTab from './components/ScanTab.vue';
import ViewTab from './components/ViewTab.vue';
import SetTab from './components/SetTab.vue';
import PurgeTab from './components/PurgeTab.vue';
import BackupTab from './components/BackupTab.vue';

export default {
  components: {
    ScanTab,
    ViewTab,
    SetTab,
    PurgeTab,
    BackupTab,
  },
  data() {
    return {
      db: null,
      backupdb: null,
      activeTab: 'scan',
      initSetup: {},
      setupData: {
          pos: '',
          dwl: '',
          date: '',
          store: '',
          dept: '',
          auto: false,
        },
      alreadyInitialized: false,
      online: false,
      appVersion: "ver 1.3.0",
      ras: "",
      apiHost: "", // You might need to configure this based on your environment
      qrReader: null,
      camContainerDisplay: 'none',
      loading: false,
      recordsCount: 0,
    };
  },
  computed: {
    onlineStatusClass() {
      return this.online ? 'text-success' : 'text-danger';
    },
    onlineStatusText() {
      return this.online ? 'Online' : 'Offline';
    },
  },
  created() {
    this.db = new PouchDB('stock', { auto_compaction: true });
    this.backupdb = new PouchDB('stockBackup', { auto_compaction: true });
    this.getInit();
    setInterval(this.isOnline, 5000);
    setInterval(this.autoUpload, 300000);
  },
  methods: {
    setActiveTab(tab) {
      this.activeTab = tab;
      this.fillSet(); // Always fill set data when switching tabs
      if (tab === 'view') {
        this.$nextTick(() => {
          if (this.$refs.viewTab && typeof this.$refs.viewTab.viewLoc === 'function') {
            this.$refs.viewTab.viewLoc();
          }
        });
      } else if (tab === 'backup') {
        this.$nextTick(() => {
          if (this.$refs.backupTab && typeof this.$refs.backupTab.viewBackup === 'function') {
            this.$refs.backupTab.viewBackup();
          }
        });
      } else if (tab === 'set') {
        this.initSetup = this.setupData
      }
    },
    async getInit() {
      this.loading = true;
      await this.isDroid();
      await this.isOnline();
      this.fillSet();
      this.keyStore();
      this.records();
      this.loading = false;
    },
    isMobileDevice() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      if (/android/i.test(userAgent)) {
        return true;
      }
      if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        return true;
      }
      if (/BlackBerry/.test(userAgent)) {
        return true;
      }
      if (/Opera Mini/.test(userAgent)) {
        return true;
      }
      if (/Mobi|Tablet|Mobile|Nokia|Windows Phone|Symbian|webOS|hpwOS|Kindle|Silk|Palm|Series60|Windows CE|Android|IEMobile|S40|MeeGo|Maemo|FirefoxMobile|Opera Mobi/i.test(userAgent)) {
        return true;
      }

      // Cek untuk layar sentuh, yang seringkali merupakan indikator mobile/tablet
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0) {
        return true;
      }

      return false;
    },
    async isDroid() {
      if (this.isMobileDevice()) {
        console.log("Aplikasi dibuka dari perangkat seluler.");
      } else {
        console.log("Aplikasi dibuka dari desktop.");
      }
    },
    async fillSet() {
      try {
        const dat = await this.db.get('setup');
        this.setupData = {
          pos: dat.pos,
          dwl: dat.dwl,
          date: dat.date,
          store: dat.store,
          dept: dat.dept,
          auto: dat.auto === 1,
        };
        this.alreadyInitialized = true;
      } catch (err) {
        this.alreadyInitialized = false;
        this.activeTab = 'set';
        Swal({
          title: "Informasi",
          text: "Harap Perbarui Data Terlebih dahulu",
          icon: `/fresh_icon.png`,
        });
      }
      this.records();
    },
    async isOnline() {
      try {
        await fetch(`${this.apiHost}`);
        this.online = true;
      } catch (xhr) {
        this.online = false;
      }
    },
    parseURL() {
      const url = new URL(window.location.href);
      const params = {};

      for (const [key, value] of url.searchParams.entries()) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
          if (Array.isArray(params[key])) {
            params[key].push(value);
          } else {
            params[key] = [params[key], value];
          }
        } else {
          params[key] = value;
        }
      }
      return params;
    },
    async keyStore() {
      const dat = this.parseURL();
      if (dat && dat.key) {
        try {
          const res = await fetch(`${this.apiHost}/ws.ras?dat=base&key=${dat.key}`);
          const data = await res.json();
          this.setupData = {
            pos: data.pos,
            dwl: data.dwl,
            date: data.date,
            store: data.store,
            dept: data.dept,
            auto: data.auto === 1,
          };
        } catch (err) {
          console.error(err);
        }
      }
    },
    async setInit() {
      const autoD = this.setupData.auto ? 1 : 0;
      const doc = {
        _id: 'setup',
        pos: this.setupData.pos,
        dwl: this.setupData.dwl,
        date: this.setupData.date,
        store: this.setupData.store,
        dept: this.setupData.dept,
        auto: autoD,
      };
      try {
        await this.db.put(doc);
        this.fillSet();
      } catch (err) {
        console.error(err);
        Swal("Error", err.message, "error");
      }
    },
    async update() {
      const dateFormat = /^\d{2}\/\d{2}\/\d{4}$/;
      const { date, store, dept, pos, dwl } = this.setupData;
      if (!date || !store || !pos || !dwl) {
        Swal("Data Tidak Lengkap", "Silahkan isi semua Data", "error");
        return;
      }
      if (!dateFormat.test(date)) {
        Swal("Salah", "Format tanggal tidak sesuai", "error");
        return;
      }
      if (store.length > 3) {
        Swal("Salah", "Kode Toko Tidak Sesuai", "error");
        return;
      }
      if (pos.length > 2) {
        Swal("Salah", "No POS Tidak Sesuai", "error");
        return;
      }

      Swal({
        title: 'Tunggu sebentar...',
        icon: '/load_for.gif',
        buttons: false,
      });

      try {
        const response = await fetch(`${this.apiHost}/ws.ras?dat=ws&dept=${dept}`);
        const list = await response.json();
        const doc = { _id: 'listSku', listSku: list };
        await this.db.put(doc);
        console.log("Berhasil diperbarui");
        Swal("Berhasil", "Data Berhasil diperbarui", "success");
      } catch (xhr) {
        console.error(xhr);
        try {
          await this.db.destroy();
        } catch (err) {
          console.error(err);
          Swal("DB Error", err.message, "error");
        }
        Swal("Error", JSON.stringify(xhr), "error");
      }
      this.setInit();
    },
    async records() {
      try {
        const doc = await this.db.get('listResultScan');
        this.recordsCount = doc.listResultScan.length; // Perbarui data recordsCount langsung
      } catch (err) {
        console.error(err);
        this.recordsCount = 0; // Perbarui data recordsCount langsung
      }
    },
    async pushBackup(index) {
      try {
        const doc = await this.backupdb.get('backupList');
        const listSku = JSON.stringify(doc.listFile[index].listSku);
        this.unduhLocal(listSku);
      } catch (err) {
        Swal("Error", err.message, "error");
      }
    },
    async startBackup(callback) {
      try {
        const doc = await this.db.get('listResultScan');
        const listSku = doc.listResultScan;
        const { date, pos, dwl } = this.setupData;
        const fileM = { timestamp: moment().unix(), name: `POS ${pos}.${dwl} Date ${date}`, listSku };

        try {
          const docs = await this.backupdb.get('backupList');
          const unixTimestamp = moment().subtract(3, 'days').unix();
          let listFile = docs.listFile;
          listFile = listFile.filter(element => element.timestamp >= unixTimestamp);
          listFile.push(fileM);
          await this.backupdb.put({ _id: 'backupList', _rev: docs._rev, listFile });
          console.log('Backup Success');
          callback(true);
        } catch (err) {
          console.error(err);
          await this.backupdb.put({ _id: 'backupList', listFile: [fileM] });
          console.log('New Backup Success');
          callback(true);
        }
      } catch (err) {
        console.error('Tidak ada yang bisa dibackup');
        callback(false);
      }
    },
    async hapusData(password) {
      if (password === "12321") {
        Swal({
          title: "Peringatan!",
          text: "Anda akan menghapus Semua Data ?",
          icon: "warning",
          buttons: true,
          dangerMode: true,
        })
        .then(async (isConfirm) => {
          if (isConfirm) {
            // Hapus 'backupSuccess' dari parameter callback
            await this.startBackup(async () => {
              try {
                if (this.db) {
                  await this.db.destroy();
                }
                console.debug('Backup Done');
                Swal({ title: "Data Terhapus", text: "Success", icon: "success" })
                  .then(() => {
                    location.reload();
                  });
              } catch (err) {
                console.error(err);
                Swal("Error", err.message, "error");
              }
            });
          }
        });
      } else {
        Swal("Salah", "Password Salah", "error");
      }
    },
    async unduhLocal() {
      try {
        const doc = await this.db.get('listResultScan');
        const listSku = doc.listResultScan;
        this.processMAuto(listSku);
      } catch (err) {
        Swal("Error", "Tidak ada Data untuk diunduh", "error");
      }
    },
    sort(array, field, ascending = true) {
      return array.sort((a, b) => {
        if (a[field] > b[field]) {
          return ascending ? 1 : -1;
        } else if (a[field] < b[field]) {
          return ascending ? -1 : 1;
        } else {
          return 0;
        }
      });
    },
    processMAuto(json) {
      const sortedData = this.sort(json, "lokasi", true);
      let loc = "";
      let seq = 1;
      let data = "";
      let pos = 0;
      let dwl = 0;
      let tgl = 0;
      let bln = 0;
      let store = 0;
      let lRows = "";

      sortedData.forEach(m => {
        const dat = m;
        if (dat.lokasi !== loc) {
          loc = dat.lokasi;
          seq = 1;
        }
        if (dat.qty > 0) {
          lRows = `${dat.store.toString().padStart(4, '0')}${dat.date.slice(6, 10)}${dat.date.slice(3, 5).padStart(2, '0')}${dat.date.slice(0, 2).padStart(2, '0')}${seq.toString().padStart(8, '0')}${dat.pos.toString().padStart(2, '0')}${dat.lokasi.toString().padStart(6, '0')}${dat.sku.padEnd(8, ' ')}             ${dat.qty.toFixed(3).padStart(12, '0')}00000000${dat.dwl}${dat.pos.toString().padStart(2, '0')}\r\n`;
          data += lRows;
          pos = dat.pos;
          dwl = dat.dwl;
          tgl = parseInt(dat.date.slice(0, 2));
          bln = parseInt(dat.date.slice(3, 5));
          store = dat.store;
          seq++;
        }
      });

      const fileName = `M${pos.toString().padStart(2, '0')}${tgl.toString().padStart(2, '0')}${bln.toString().padStart(2, '0')}${dwl}.${store.toString().padStart(3, '0')}`;
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    async uploadM(listSku) {
      if (this.online) {
        if (listSku.length) {
          Swal({
            title: 'Tunggu sebentar...',
            icon: '/load_for.gif',
            buttons: false,
          });
          try {
            const response = await fetch(`${this.apiHost}/stock.ras`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
              },
              body: listSku,
            });
            const data = await response.json();
            if (data > 0) {
              Swal(`${data} Data Berhasil diunggah`, "Process File M", "success");
            } else {
              Swal("Gagal!", "Data tidak berhasil diunggah", "error");
            }
          } catch (err) {
            Swal({
              title: `Error ${err.status}`,
              text: err.responseText || err.statusText,
              html: true,
              icon: "error" // Added icon for error
            });
          }
        }
      } else {
        Swal("Mode Offline", "Tidak dapat diunggah", "error");
      }
    },
    async unggah() {
      try {
        const doc = await this.db.get('listResultScan');
        const listSku = JSON.stringify(doc.listResultScan);
        this.uploadM(listSku);
      } catch (err) {
        Swal("Error", "Tidak ada Data untuk diunggah", "error");
      }
    },
    async autoUpload() {
      if (this.setupData.auto && this.online) {
        let dateIn;
        try {
          const dat = await this.db.get('setup');
          dateIn = dat.date;
        } catch (err) {
          console.error(err);
          return;
        }

        if (dateIn === moment().format('DD/MM/YYYY')) {
          try {
            const doc = await this.db.get('listResultScan');
            if (doc.listResultScan.length > 0) {
              const listSku = JSON.stringify(doc.listResultScan);
              await fetch(`${this.apiHost}/postAuto`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json; charset=utf-8',
                },
                body: listSku,
              });
            }
          } catch (err) {
            console.log(`Auto Upload: Server Error - ${err.status}`);
          }
        }
      }
    },
    getLocation(str) {
      if (str.substr(0, 4) === "2100" && str.length === 13) {
        return str.substr(7, 4) * 1;
      }
      if (str.length === 8) {
        return str.substr(0, 7) * 1;
      }
      return str.trim() * 1;
    },
    isPLU(str) {
      if (str.substr(0, 2) === "24" && str.length === 18) {
        return true;
      }
      if (str.substr(0, 2) === "24" && str.length === 13) {
        return true;
      }
      if (str.substr(0, 2) === "24" && str.length === 20) {
        return true;
      }
      return false;
    },
    getSKU(str) {
      if (str.substr(0, 4) === "2100") {
        return str.substr(4, 8);
      } else {
        return str;
      }
    },
    getPLU(str) {
      const plu = this.isPLU(str);
      if (plu) {
        return str.length === 18 ? str.substr(2, 4) : str.substr(3, 4);
      }
      return this.getSKU(str);
    },
    getQtyScale(num) {
      const plu = this.isPLU(num);
      if (plu && num.length === 18) {
        let qtyPost = num.substr(12, 2) + "." + num.substr(14, 3);
        let qtyScale = qtyPost * 1000;
        qtyPost = qtyScale * 1 <= 19 ? qtyScale : qtyPost;
        if (qtyScale === 0) {
          qtyPost = 1;
        }
        return qtyPost * 1;
      } else if (plu && num.length === 20) {
        let qtyPost = num.substr(14, 2) + "." + num.substr(16, 3);
        let qtyScale = qtyPost * 1000;
        qtyPost = qtyScale * 1 <= 19 ? qtyScale : qtyPost;
        if (qtyScale === 0) {
          qtyPost = 1;
        }
        return qtyPost * 1;
      } else {
        return "";
      }
    },
    processBarcode(barcode) {
      // Panggil metode di ScanTab melalui ref
      if (this.$refs.scanTab && typeof this.$refs.scanTab.processBarcodeFromParent === 'function') {
        this.$refs.scanTab.processBarcodeFromParent(barcode);
      }
    },
    nikoBarcodeListener(e) {
      localStorage["nikoBarcodeKeyboard"] = "";
      if (e.url.split("#")[0] === window.location.href) {
        window.focus();
        this.processBarcode(decodeURIComponent(e.newValue));
      }
      window.removeEventListener("storage", this.nikoBarcodeListener, false);
    },
    startScanner() {
      if (this.$refs.scanTab && typeof this.$refs.scanTab.updateDesc === 'function') {
        this.$refs.scanTab.updateDesc("Please Install NIKO Barcode first");
      }
      const currentUrl = window.location.href.split("#")[0];
      window.addEventListener("storage", this.nikoBarcodeListener, false);
      window.open(`niko.barcode.keyboard://scan/${encodeURIComponent(currentUrl + "#{CODE}")}`, '_self');
    },
    stopCam() {
      this.camContainerDisplay = 'none';
      if (this.qrReader) {
        this.qrReader.stop();
      }
    },
    startCam() {
      Html5Qrcode.getCameras().then(devices => {
        if (devices && devices.length) {
          this.qrReader = new Html5Qrcode("reader", { experimentalFeatures: { useBarCodeDetectorIfSupported: true } });
          this.camContainerDisplay = 'block';
          this.qrReader.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              this.processBarcode(decodedText);
              this.stopCam();
            },
            (errorMessage) => {
              console.error(errorMessage);
            }
          ).catch((err) => {
            console.error(err);
            if (this.$refs.scanTab && typeof this.$refs.scanTab.updateDesc === 'function') {
              this.$refs.scanTab.updateDesc("Failed Start Camera");
            }
          });
        }
      }).catch(err => {
        console.error(err);
        if (this.$refs.scanTab && typeof this.$refs.scanTab.updateDesc === 'function') {
          this.$refs.scanTab.updateDesc("Failed Start Camera");
        }
      });
    },
    updateSetupData(newSetupData) {
      this.setupData = { ...this.setupData, ...newSetupData };
    },
  },
  mounted() {
    if (window.location.hash !== "") {
      localStorage["nikoBarcodeKeyboard"] = window.location.hash.substr(1);
      self.close();
      window.location.href = "about:blank"; // In case self.close is disabled
    } else {
      window.addEventListener("hashchange", () => {
        window.removeEventListener("storage", this.nikoBarcodeListener, false);
        const hash = window.location.hash.substr(1);
        if (hash !== "") {
          window.location.hash = "";
          this.processBarcode(decodeURIComponent(hash));
        }
      }, false);
    }
  },
};
</script>

<style>
/* Your existing CSS styles go here */
.sweet-alert {
  top: 30% !important;
}

.numpad-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  max-width: 80%;
  margin: 20px auto;
}

.numpad-key {
  padding: 15px;
  text-align: center;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 18px;
  cursor: pointer;
  user-select: none;
}

.numpad-key:active {
  background: #0056b3;
}

.numpad-key.tall {
  grid-row: span 2;
}

.numpad-key.wide {
  grid-column: span 2;
}

.spinner-border {
  /* Add your spinner styling */
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
}
</style>