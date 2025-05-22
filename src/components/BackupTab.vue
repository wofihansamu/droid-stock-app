<template>
  <div id="backup">
    <table class="table" id="tbackup">
      <thead class='thead-light'>
        <tr>
          <td>File</td>
          <td>Timestamp</td>
          <td>Act</td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(file, index) in backupFiles" :key="index">
          <td>{{ file.name }}</td>
          <td>{{ formatTimestamp(file.timestamp, "DD/MM/YYYY HH:mm:ss") }}</td>
          <td><a href="#" @click.prevent="pushBackup(index)"><span class='glyphicon glyphicon-export'></span></a></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import PouchDB from 'pouchdb';
import moment from 'moment';

export default {
  name: 'BackupTab',
  data() {
    return {
      backupdb: null,
      backupFiles: [],
    };
  },
  created() {
    this.backupdb = new PouchDB('stockBackup', { auto_compaction: true });
    this.viewBackup();
  },
  methods: {
    async viewBackup() {
      try {
        const doc = await this.backupdb.get('backupList');
        this.backupFiles = doc.listFile;
      } catch (err) {
        console.error(err);
        this.backupFiles = [];
      }
    },
    pushBackup(index) {
      this.$emit('push-backup', index);
    },
    // Metode baru untuk memformat timestamp
    formatTimestamp(timestamp, format) {
      return moment.unix(timestamp).format(format);
    }
  },
  // Hapus blok 'filters' ini sepenuhnya
  // filters: {
  //   moment: function (date, format) {
  //     return moment.unix(date).format(format);
  //   }
  // }
};
</script>