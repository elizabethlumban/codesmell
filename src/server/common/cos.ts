import * as AWS from 'ibm-cos-sdk';
import { Credentials } from './cfenv';

class Cos {

    public cos: AWS.S3;

    constructor() {

        const cfg: any = Credentials('COS');

        this.cos = new AWS.S3(cfg);
    }
}

export const cos: AWS.S3 = new Cos().cos;
