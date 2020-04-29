import * as path from 'path';
import { Pool } from 'ibm_db';
import { Credentials } from './cfenv';
import { utils } from './utils';
export { Database } from 'ibm_db';

export { Pool } from 'ibm_db';

export interface IDB2Conn {
    connString: string;
    ibmdb: Pool;
}

export class DB2Config {

    public conn: IDB2Conn;

    constructor() {
        const datab: any = this.getDatab('db2');
        this.conn = this.getConn(datab);
        // `debug(true);
    }

    public getDatab = (db2env: string): any => {
        return Credentials(db2env);
    }

    public getConn = (datab: any): IDB2Conn => {

        let conn: IDB2Conn;

        if (process.env.SSL) {
            utils.logInfo(`$db2config (getConn): Using DB2 SSL - db: ${datab.db} - host: ${datab.hostname} - port: ${datab.port}`);
            conn = {
                connString: `PROTOCOL=TCPIP;DATABASE=${datab.db};UID=${datab.username};` +
                    `PWD=${datab.password};HOSTNAME=${datab.hostname};Security=SSL;Servicename=${datab.sslport};` +
                    `SSLServerCertificate=${path.resolve()}/server/${datab.arm};QueryTimeout=60;CHARSET=UTF8;`,
                ibmdb: new Pool(),
            };
        } else {
            utils.logInfo(`$db2config (getConn): Using DB2 - db: ${datab.db} - host: ${datab.hostname} - port: ${datab.port}`);
            conn = {
                connString: `PROTOCOL=TCPIP;DATABASE=${datab.db};UID=${datab.username};PWD=${datab.password}` +
                    `;HOSTNAME=${datab.hostname};PORT=${datab.port};QueryTimeout=60;CHARSET=UTF8;`,
                ibmdb: new Pool(),
            };
        }

        return conn;
    }
}

export const db2config: DB2Config = new DB2Config();
