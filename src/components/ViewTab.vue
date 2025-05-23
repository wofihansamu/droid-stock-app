<template>
  <div id="view">
    <div class="form-group">
      <label>LOKASI</label>
      <div class="input-group">
        <select class="form-control" id="vlokasi" name="vlokasi" v-model="selectedLocation">
          <option value="-">Pilih Lokasi</option>
          <option v-for="loc in uniqueLocations" :key="loc" :value="loc">{{ loc }}</option>
        </select>
        <span class="input-group-btn">
          <button class="btn btn-success" id="btn_check" @click="viewItem"><span class='glyphicon glyphicon-filter'></span> filter</button>
        </span>
      </div>
    </div>
    <label id="vlok">Lokasi : {{ displayLocation }}</label>
    <table class="table" id="vtable">
      <thead class='thead-light'>
        <tr>
          <td>No</td>
          <td>SKU Desc</td>
          <td>Qty</td>
          <td>Act</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in filteredItems" :key="item._id">
          <td>{{ index + 1 }}</td>
          <td>{{ item.sku }} {{ item.desc }}</td>
          <td>{{ item.qty }}</td>
          <td><a href="#" @click.prevent="delItem(index)"><span class='glyphicon glyphicon-edit'></span></a></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import PouchDB from 'pouchdb';
import Swal from 'sweetalert';

export default {
  name: 'ViewTab',
  data() {
    return {
      db: null,
      selectedLocation: '-',
      allScanResults: [],
      displayLocation: '',
      uniqueLocations: [],
    };
  },
  computed: {
    filteredItems() {
      if (this.selectedLocation === '-' || !this.selectedLocation) {
        return [];
      }
      return this.allScanResults.filter(item => item.lokasi === this.selectedLocation);
    }
  },
  created() {
    this.db = new PouchDB('stock', { auto_compaction: true });
    this.viewLoc();
  },
  methods: {
    async viewItem() {
      this.displayLocation = this.selectedLocation;
      try {
        const doc = await this.db.get('listResultScan');
        this.allScanResults = doc.listResultScan;
      } catch (err) {
        console.error(err);
        this.allScanResults = [];
      }
    },
    async delItem(index) {
      try {
        const docread = await this.db.get('listResultScan');
        let listResultScan = docread.listResultScan;
        const itemToDelete = listResultScan[index];
        const tloc = itemToDelete.lokasi;

        Swal({
          title: itemToDelete.desc,
          text: "Masukkan Qty",
          content: {
            element: "input",
            attributes: {
              placeholder: "Type your password",
              type: "text",
              value: itemToDelete.qty
            },
          },
          buttons: {
            cancel: {
            text: "Cancel",
            value: null,
            visible: true,
            className: "",
            closeModal: true,
          },
            confirm: {
              text: "Koreksi",
              value: true,
              visible: true,
              className: "",
              closeModal: true
            }
          },
        })
        .then(async (val) => {
          console.log(val)
          if (val && val * 1 < 99999 && val * 1 >= 0) { // Access value via .value
            listResultScan[index].qty = val * 1;
            const id_rev = docread._rev;
            const docs = {
              listResultScan: listResultScan,
              _id: 'listResultScan',
              _rev: id_rev,
            };
            try {
              await this.db.put(docs);
              this.selectedLocation = tloc; // Set location to trigger re-filter
              await this.viewItem(); // Re-fetch and re-render
              Swal("Berhasil", "Qty sudah diganti", "success");
            } catch (err) {
              console.error(err);
              Swal("Error", err.message, "error");
            }
          }
        });
      } catch (err) {
        console.error(err);
      }
    },
    async viewLoc() {
      try {
        const doc = await this.db.get('listResultScan');
        const arrLok = [];
        for (let i = 0; i < doc.listResultScan.length; i++) {
          arrLok.push(doc.listResultScan[i].lokasi);
        }
        this.uniqueLocations = [...new Set(arrLok)].sort(); // Get unique and sort
      } catch (err) {
        console.error(err);
        this.uniqueLocations = [];
      }
    },
  },
};
</script>