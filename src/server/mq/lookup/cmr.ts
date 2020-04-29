
import { _db2 } from '../../common/db2.functions';
import { utils } from '../../common/utils';

class CmrSqlFunctions {
    constructor() {/* */ }

    public queryCMR = (custnbr: string, countrycode: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            const ccode: string = countrycode.trim();
            const sql: string = `SELECT CUSTNAME, ID, CUSTKEY, MARKET FROM ${utils.Env.k8_db2schema}.ESW#CMR WHERE
            (CCODE = '${ccode}' AND CUSTNBR = '${custnbr}')
            OR IERPSITENO = '${custnbr}'
            FETCH FIRST ROW ONLY OPTIMIZE FOR 1 ROW FOR READ ONLY WITH UR`;
            const fields: any[] = ['CUSTNAME', 'ID', 'CUSTKEY', 'MARKET'];
            const [err, results] = await utils.top(_db2.runQuery(sql, fields));
            if (err) {
                return reject({
                    ...err,
                    location: '$cmr.ts (queryCMR)', //params.location,
                    params: fields,
                    reason: 'SELECT CUSTNAME, ID, CUSTKEY, MARKET from ESW#CMR failed',
                    sql,
                });
            }

            return resolve(results);
        })

    public queryShopzFocal = (custkey: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            const ccustkey: string = custkey.trim();
            const sql: string = `SELECT C.CONTACTEMAIL AS CONTACTEMAIL
            FROM ${utils.Env.k8_db2schema}.ESW#CMR_CONTACTS C, ${utils.Env.k8_db2schema}.ESW#CMR R
            WHERE R.CUSTKEY = C.CUSTKEY AND C.CUSTKEY = '${ccustkey}' AND C.ROLE = 'ShopZ Focal' `;

            const fields: any[] = ['CONTACTEMAIL'];
            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                    ...err,
                    location: '$cmr.ts (queryShopzFocal)', //params.location,
                    params: fields,
                    reason: 'SELECT CONTACTEMAIL ESW#CMR_CONTACTS failed',
                    sql,
                });
            }

            return resolve(results);
        })

    public queryCMRDummy = (countrycode: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            const ccode: string = countrycode.trim();
            const sql: string = `SELECT CUSTNAME, ID, CUSTKEY, MARKET FROM ${utils.Env.k8_db2schema}.ESW#CMR WHERE CCODE = '${ccode}'
            AND CUSTNBR = '000000' FETCH FIRST ROW ONLY OPTIMIZE FOR 1 ROW FOR READ ONLY WITH UR`;
            const fields: any[] = ['CUSTNAME', 'ID', 'CUSTKEY', 'MARKET'];
            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                    ...err,
                    location: '$cmr.ts (queryCMRDummy)', //params.location,
                    params: fields,
                    reason: 'SELECT ID, CUSTKEY ESW#CMR failed',
                    sql,
                });
            }

            return resolve(results);
        })
}

export const cmrSQL: CmrSqlFunctions = new CmrSqlFunctions();
