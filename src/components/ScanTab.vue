<template>
  <div id="scan">
    <form autocomplete="off" name="ras">
      <div class="form-group">
        <label>LOKASI</label>
        <input class="form-control" type="number" name="lokasi" id="lokasi" required v-model="lokasi" @keydown.enter.prevent="handleLokasiEnter" @focus="selectLokasi" ref="lokasiInput">
        <label>SKU/UPC/PLU</label>
        <div class="input-group">
          <input class="form-control" type="number" name="upc" id="upc" required v-model="upc" @keyup="handleUpcKeyup" @keydown.enter.prevent="handleUpcEnter" ref="upcInput">
          <span class="input-group-btn">
            <a class="btn btn-primary" id="btn_scan" href="#" @click="$emit('start-cam')"><span class='glyphicon glyphicon-camera'></span> Kamera</a>
          </span>
        </div>
        <label>QTY (Pcs/Kg)</label>
        <input class="form-control" :type="qtyInputType" name="qty" id="qty" :disabled="qtyDisabled" v-model="qty" @keydown.enter.prevent="handleQtyEnter" ref="qtyInput">
        <input type="hidden" name="sku" id="sku" v-model="sku">
        <small class="text-muted" id="info">*Tekan Enter</small>
        <section id="desc" class="text-right text-danger">{{ desc }}</section>
      </div>
    </form>
    <div class="numpad-container" id="numpad">
      <button v-for="key in numpadKeys" :key="key"
              :class="['numpad-key', { 'tall': key === '↵' }]"
              @click="handleNumpadClick(key)">
        {{ key }}
      </button>
    </div>
  </div>
</template>

<script>
import PouchDB from 'pouchdb';
import Swal from 'sweetalert';

export default {
  name: 'ScanTab',
  props: ['setupData'],
  data() {
    return {
      db: null,
      lokasi: '',
      upc: '',
      qty: '',
      sku: '',
      desc: '',
      qtyDisabled: true,
      numpadKeys: [
        "1", "2", "3",
        "4", "5", "6",
        "7", "8", "9",
        ".", "0", "↵",
        "C", "←"
      ],
      qtyInputType: 'number',
    };
  },
  created() {
    this.db = new PouchDB('stock', { auto_compaction: true });
  },
  watch: {
    upc(newVal) {
      this.qtyDisabled = true;
      if (newVal.length < 3) {
        this.qty = "";
      }
    },
  },
  methods: {
    validLoc() {
      this.lokasi = this.getLocation(this.lokasi);
      if (this.lokasi.length > 4 || this.lokasi.length < 1 || this.lokasi === '0') {
        Swal("Tidak bisa", "Lokasi Tidak Benar", "error");
        if (this.$refs.lokasiInput) {
          this.$refs.lokasiInput.select();
        }
        return false;
      }
      return true;
    },
    handleLokasiEnter() {
      if (this.validLoc()) {
        this.$nextTick(() => {
          if (this.$refs.upcInput) {
            this.$refs.upcInput.focus();
          }
        });
      }
    },
    selectLokasi() {
      if (this.$refs.lokasiInput) {
        this.$refs.lokasiInput.select();
      }
    },
    handleUpcKeyup() {
      this.qtyDisabled = true;
      if (this.upc.length < 3) {
        this.qty = "";
      }
    },
    async handleUpcEnter() {
      this.enableNumpad();
      this.qty = this.getQtyScale(this.upc);
      let processedUpc = this.getPLU(this.upc);

      try {
        const doc = await this.db.get('listSku');
        if (doc.listSku.length === 0) {
          Swal("Error", "List SKU is empty. Please update data in 'Set' tab.", "error");
          return;
        }
        const result = doc.listSku.find(obj => obj.UPC === processedUpc);
        if (result) {
          this.upc = result.SKU;
          this.sku = result.SKU;
          this.desc = `<label>${result.NAME}</label>`;
          this.qtyDisabled = false;
          this.$nextTick(() => {
            if (this.$refs.qtyInput) {
              this.$refs.qtyInput.focus();
            }
          });
        } else {
          if (processedUpc.length === 8) {
            this.sku = processedUpc;
            this.desc = "<label>SKU Tidak ditemukan</label>";
            this.qtyDisabled = false;
            this.$nextTick(() => {
              if (this.$refs.qtyInput) {
                this.$refs.qtyInput.focus();
              }
            });
          } else {
            this.sku = "";
            this.desc = "";
            this.qtyDisabled = true;
            this.disableNumped();
            if (this.$refs.upcInput) {
              this.$refs.upcInput.select();
            }
          }
          Swal("Not Found", `${processedUpc} : Item tidak ditemukan`, "info");
        }
      } catch (err) {
        Swal("Error", err.message, "error");
        console.error(err);
      }
    },
    async handleQtyEnter() {
      if (!this.validLoc()) {
        return;
      }
      const qty = this.qty * 1;
      if (qty > 99999 || qty <= 0 || this.qty === "") {
        Swal("Qty Tidak Benar", "Error", "error");
        return;
      }

      const { store, date, pos, dwl } = this.setupData;
      const lokasi = this.lokasi;
      const sku = this.sku;
      const desc = this.desc;

      const newDoc = {
        _id: new Date().getTime(),
        store,
        date,
        pos,
        dwl,
        lokasi,
        sku,
        qty,
        desc,
      };

      try {
        const res = await this.db.get('listResultScan');
        const listResultScan = res.listResultScan;
        listResultScan.push(newDoc);
        const id_rev = res._rev;
        const docs = {
          listResultScan: listResultScan,
          _id: 'listResultScan',
          _rev: id_rev,
        };
        await this.db.put(docs);
      } catch (err) {
        if (err.name === 'not_found') {
          await this.db.put({ listResultScan: [newDoc], _id: 'listResultScan' });
        } else {
          console.error(err);
          Swal("Error", err.message, "error");
          return;
        }
      }

      this.upc = "";
      this.sku = "";
      this.desc = "";
      this.qty = "";
      this.qtyDisabled = true;
      this.disableNumped();
      this.$nextTick(() => {
        if (this.$refs.upcInput) {
          this.$refs.upcInput.focus();
        }
      });
      this.count();
      this.$emit('update-records'); // Emit event to parent to update records count
    },
    async count() {
      try {
        const doc = await this.db.get('listResultScan');
        let c = 0;
        for (let i = 0; i < doc.listResultScan.length; i++) {
          if (doc.listResultScan[i].lokasi === this.lokasi) {
            c++;
          }
        }
        this.desc = `<label>posted : ${c}</label>`;
      } catch (err) {
        console.error(err);
        this.desc = `<label>posted : 0</label>`;
      }
    },
    processBarcodeFromParent(barcode) {
      this.upc = barcode;
      this.handleUpcEnter();
    },
    updateDesc(message) {
      this.desc = `<label>${message}</label>`;
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
    handleNumpadClick(key) {
      if (this.qtyDisabled) { // If qty is disabled, numpad operates on UPC
          let currentUpc = this.upc.toString();
          if (key === "C") {
              this.upc = "";
          } else if (key === "←") {
              this.upc = currentUpc.slice(0, -1);
          } else if (key === "↵") {
              this.handleUpcEnter();
          } else {
              this.upc = currentUpc + key;
          }
      } else { // Numpad operates on QTY
          let currentValue = this.qty.toString();
          if (key === "C") {
              this.qty = "";
          } else if (key === "←") {
              let temp = currentValue.slice(0, -1);
              if (temp.slice(-1) === ".") {
                  this.qtyInputType = "text";
              } else {
                  this.qtyInputType = "number";
              }
              this.qty = temp;
          } else if (key === ".") {
              this.qtyInputType = "text";
              if (!currentValue.includes(".")) {
                  this.qty = currentValue + key;
              }
          } else if (key === "0") {
              this.qtyInputType = "number";
              if (currentValue !== "0") {
                  this.qty = currentValue + key;
              }
          } else if (key === "↵") {
              this.handleQtyEnter();
          } else {
              this.qtyInputType = "number";
              if (currentValue === "0") {
                  this.qty = key;
              } else {
                  this.qty = currentValue + key;
              }
          }
      }
    },
    disableNumped() {
      // Logic to disable numpad visibility/interactivity if needed
    },
    enableNumpad() {
      // Logic to enable numpad visibility/interactivity if needed
    },
  },
};
</script>