<template>
  <div id="purge">
    <div class="form-group">
      <label>Kata Kunci </label>
      <input class="form-control" type="password" name="pass" id="pass" required v-model="password">
      <small class="form-text text-muted">
        Jika anda menekan Tombol <b>Hapus Data</b> artinya anda akan menghapus semua data
        Stock yang ada di perangkat ini.
      </small><br>
      <button class="btn btn-danger" id="btn_hapus" :disabled="!canDelete" @click="hapusData">Hapus Data</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PurgeTab',
  props: ['online'],
  data() {
    return {
      password: '',
    };
  },
  computed: {
    canDelete() {
      return this.online;
    }
  },
  methods: {
    hapusData() {
      this.$emit('trigger-hapus', this.password);
    }
  }
};
</script>