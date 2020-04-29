const CloudantLib: any = require('@cloudant/cloudant');
import { Credentials } from './cfenv';

class Cloudant {

    public cloudant: any;
    public cloudantext: any;

    constructor() {

        const cfg: any = Credentials('cloudant_esw');
        this.cloudant = CloudantLib({ url: cfg.url, plugins: 'promises' });

        const cfgext: any = Credentials('cloudant_ext');
        this.cloudantext = CloudantLib({ url: cfgext.url, plugins: 'promises' });

    }
}

export const cloudant: any = new Cloudant().cloudant;
export const cloudantext: any = new Cloudant().cloudantext;
