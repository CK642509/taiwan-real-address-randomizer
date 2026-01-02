import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import { createGtag } from "vue-gtag";

const app = createApp(App)

const gtag = createGtag({
  tagId: import.meta.env.VITE_GA_ID,
})

app.use(gtag)
app.mount('#app')
