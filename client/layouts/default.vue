<template>
  <v-app>
    <v-app-bar app>
      <nuxt-link class="header-logo" to="/">
        <v-avatar class="gear-app-logo" size="36">
          <span>AN</span>
        </v-avatar>
        <v-toolbar-title class="gear-app-name d-none d-sm-flex ml-2">
          <span>ancient</span>
        </v-toolbar-title>
      </nuxt-link>
      <v-spacer></v-spacer>
      <v-tooltip bottom>
        <template v-slot:activator="{ on }">
          <v-btn text v-on="on" to="/docs">
            <v-icon left>fas fa-book</v-icon>
            <span class="d-none d-md-flex">Docs</span>
          </v-btn>
        </template>
        <span>View the docs</span>
      </v-tooltip>
      <v-tooltip bottom>
        <template v-slot:activator="{ on }">
          <v-btn
            text
            v-on="on"
            href="https://www-db.embl.de/EMBLPersonGroup-PersonPicture/MailForm/?recipient=ggenomics"
          >
            <v-icon left>far fa-question-circle</v-icon>
            <span class="d-none d-md-flex">Help</span>
          </v-btn>
        </template>
        <span>Ask for help</span>
      </v-tooltip>
      <v-tooltip bottom>
        <template v-slot:activator="{ on }">
          <v-btn text v-on="on" href="https://github.com/gear-genomics">
            <v-icon left>fab fa-github</v-icon>
            <span class="d-none d-md-flex">GitHub</span>
          </v-btn>
        </template>
        <span>Go to GitHub page</span>
      </v-tooltip>
    </v-app-bar>
    <v-content class="pb-12">
      <nuxt/>
    </v-content>
    <v-footer class="d-flex justify-end align-center pa-4" absolute elevation="2">
      <span>Supported by</span>
      <a href="https://embl.de">
        <img class="footer-logo ml-1" src="@/assets/embl.svg" alt="EMBL logo">
      </a>
    </v-footer>
  </v-app>
</template>

<style scoped>
.v-app-bar .v-btn {
  height: 100% !important;
}
.v-app-bar,
.v-footer {
  background-color: rgba(255, 255, 255, 0.95);
  background-image: url('~@/assets/hero-patterns-topography.svg');
  background-repeat: repeat;
}
.footer-logo {
  height: 2rem;
  vertical-align: middle;
}
.header-logo {
  height: 100%;
  text-decoration: none;
  color: inherit;
  display: flex;
  align-items: center;
}
.gear-app-name {
  font-family: Rosarivo, sans-serif;
  font-size: 1.75rem;
}
.gear-app-logo {
  background-color: rgba(0, 0, 0, 0.87);
  color: white;
  font-family: 'Unica One', sans-serif;
  font-size: 1.25rem;
}
</style>