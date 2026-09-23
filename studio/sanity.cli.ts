import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: 'wml93cow',
    dataset: 'production',
  },
  studioHost: 'jimlucke', // Requested studio hostname (subject to availability confirmation upon deploy)
});
