import { _db2 } from '../../common/db2.functions';
import { utils } from '../../common/utils';

class CurrencySqlFunctions {
    constructor() {/* */ }
    public getCurrIsoMarketByCC = (countrycode: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            const cc: string = countrycode.trim();

            const sql: string = `SELECT CURR, ISO, MARKET, CCODE, COUNTRY FROM ${utils.Env.k8_db2schema}.ENV#ORG WHERE CCODE = '${cc}'
            FETCH FIRST ROW ONLY FOR READ ONLY WITH UR OPTIMIZE FOR 1 ROW`;
            const fields: any[] = ['CURR', 'ISO', 'MARKET', 'CCODE', 'COUNTRY'];

            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                    ...err,
                    location: '$envorg.ts (getCurrIsoMarketByCC)', //params.location,
                    params: fields,
                    reason: `SELECT CURR, ISO, MARKET, CCODE, COUNTRY from ENV#ORG failed`,
                    sql,
                });
            }

            return resolve(results);
        })

    public getCurrIsoMarketCCByName = (countrycode: string, countryname: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            const cc: string = countrycode.trim();
            const cname: string = countryname.toUpperCase();
            const sql: string = `SELECT CURR, ISO, MARKET, CCODE, COUNTRY FROM ${utils.Env.k8_db2schema}.ENV#ORG WHERE CCODE = '${cc}'
            AND  UCASE(COUNTRY) LIKE '${cname}' FETCH FIRST ROW ONLY FOR READ ONLY WITH UR OPTIMIZE FOR 1 ROW`;
            const fields: any[] = ['CURR', 'ISO', 'MARKET', 'CCODE', 'COUNTRY'];
            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                    ...err,
                    location: '$envorg.ts (getCurrIsoMarketCCByName)',
                    params: fields,
                    reason: 'SELECT  CURR, ISO, MARKET, CCODE, COUNTRY from ENV#ORG failed',
                    sql,
                });
            }

            return resolve(results);
        })

    public getCurrIsoMarketByName = (iso: string, countryname: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            const ciso: string = iso.trim();
            const cname: string = countryname.toUpperCase();
            const sql: string = `SELECT CURR, ISO, MARKET, CCODE, COUNTRY FROM ${utils.Env.k8_db2schema}.ENV#ORG WHERE ISO = '${ciso}' AND
            UCASE(COUNTRY) LIKE '${cname}' FETCH FIRST ROW ONLY FOR READ ONLY WITH UR OPTIMIZE FOR 1 ROW`;
            const fields: any[] = ['CURR', 'ISO', 'MARKET', 'CCODE', 'COUNTRY'];
            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                    ...err,
                    location: '$envorg.ts (getCurrIsoMarketByName)',
                    params: fields,
                    reason: 'SELECT CURR, ISO, MARKET, CCODE, COUNTRY from ENV#ORG failed',
                    sql,
                });
            }

            return resolve(results);
        })

    public getCurrIsoMarketByIso = (iso: string): Promise<any> =>

        new Promise(async (resolve, reject) => {

            const sql: string = `SELECT CURR, ISO, MARKET, CCODE, COUNTRY FROM ${utils.Env.k8_db2schema}.ENV#ORG WHERE ISO = '${iso}'`;
            const fields: any[] = ['CURR', 'ISO', 'MARKET', 'CCODE', 'COUNTRY'];
            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                    ...err,
                    location: '$envorg.ts (getCurrIsoMarketByIso)',
                    params: fields,
                    reason: 'SELECT CURR, ISO, MARKET, CCODE, COUNTRY from ENV#ORG failed',
                    sql,
                });
            }

            return resolve(results);
        })
}

export const envOrgSQL: CurrencySqlFunctions = new CurrencySqlFunctions();
