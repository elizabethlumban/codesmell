import { _db2 } from '../../common/db2.functions';
import { IInsertParamShopz } from '../../common/interfaces';
import { utils } from '../../common/utils';
import { ILog } from '../../common/rabbitmq';

interface IReqUsersLog {
    ID: string;
    TRANSID: string;
}

class RequestSqlFunctions {

    public fileloc = 'requests.ts';

    constructor() {/* */ }
    // used by shopz
    public insertRequest = (insertParams: IInsertParamShopz): Promise<any> =>

        new Promise(async (resolve, reject) => {
            let t: string = new Date().toISOString();
            t = t.replace('T', ' ');
            t = t.replace('Z', '');

            const log: ILog = this.makeLog(insertParams);
            log.action = 'newrequest';
            log.event = 'insert';
            log.message = 'Inserting New Request from parsed Shopz email';

            let strDueDate: any = new Date(insertParams.DUEDATE);
            strDueDate = `${strDueDate.getFullYear()}-${(strDueDate.getMonth() + 1)}-${strDueDate.getDate()}`;
            const sql: string = `INSERT INTO ${utils.Env.k8_db2schema}.ESW#REQ (ID, COUNTRY, CCODE, REQ,
               STATUS,REQTYPE, CREATED, CUSTNAME, DUEDATE,OWNERGR,SUBJ,CUSTID,CHANNEL,BUNIT,BILLAMOUNT,CURR,
               ISO, MARKET, RELATEDOPPFLAG,ENGAGEMENTOPTION,ENGAGEMENTNUMBER)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            let params: any;
            params = [
                insertParams.ID,
                insertParams.COUNTRY,
                insertParams.CCODE,
                insertParams.REQ.trim(),
                insertParams.STATUS,
                insertParams.REQTYPE,
                t,
                insertParams.CUSTNAME,
                strDueDate,
                insertParams.OWNERGR,
                insertParams.SUBJECT,
                insertParams.CUSTID,
                'Direct',
                'System Middleware',
                '0',
                insertParams.CURR,
                insertParams.ISO,
                insertParams.MARKET,
                'No',
                'Post Sales Support',
                '',
            ];

            let [err] = await utils.top(_db2.runInsert(sql, params, { ...log }));
            if (err) {
                /** update the couch db
                 * send the params
                 */
                return reject({
                    ...err,
                    location: `${this.fileloc}  (insertRequest)`, //params.location,
                    params,
                    reason: 'Insert to ESW#REQ failed',
                    sql,
                    transid: insertParams.TRANSID,
                });
            }

            const guid: any = utils.guid();
            const sql1: string = `INSERT INTO ${utils.Env.k8_db2schema}.ESW#REQ_RELATED (ID, REQID, RELTYPE, VALUE,RELTYPEDISPLAY, FLAG)
               VALUES (?,?,?,?,?,?)`;
            let params1: any;
            params1 = [
                guid,
                insertParams.ID,
                insertParams.RELTYPE,
                insertParams.RELTYPEVALUE,
                insertParams.RELTYPEDISPLAY,
                '1',
            ];

            const log1: ILog = this.makeLog(insertParams);
            log1.action = 'related';
            log1.event = 'insert';
            log1.message = 'Inserting Reqrelated Item';

            [err] = await utils.top(_db2.runInsert(sql1, params1, { ...log1 }));
            if (err) {
                return reject({
                    ...err,
                    location: `${this.fileloc} (insertRequest)`,
                    params: params1,
                    reason: 'Insert to ESW#REQ_RELATED failed',
                    sql,
                    transid: params.transid,
                });
            }

            resolve();

        })

    public insertReqUsers = (id: string, transid: string, reqname: string, reqemail: string): Promise<any> =>

        new Promise(async (resolve, reject) => {

            /** insert req flag */
            const sql1: string = `INSERT INTO ${utils.Env.k8_db2schema}.ESW#REQ_USERS (ID, REQID, NAME, EMAIL, TYPE) VALUES (?,?,?,?,?)`;
            const params1: any[] = [
                utils.guid(),
                id,
                reqname,
                reqemail,
                'Requester',
            ];

            const body: IReqUsersLog = {
                ID: id,
                TRANSID: transid,
            };
            const log: ILog = this.makeLog(body);
            log.action = 'newrequest';
            log.event = 'insert';
            log.message = 'Inserting Requester';

            /**  const p1: any = _db2.runStatement(sql1, params1, log); */

            let [err] = await utils.top(_db2.runStatement(sql1, params1, { ...log }));
            if (err) {
                return reject({
                    ...err,
                    location: `${this.fileloc} (insertReqUsers)`, //params.location,
                    params1,
                    reason: 'Insert of Requester to ESW#REQ_USERS failed',
                    sql1,
                    transid,
                });
            }

            const sql2: string = `INSERT INTO ${utils.Env.k8_db2schema}.ESW#REQ_USERS (ID, REQID, NAME, EMAIL, TYPE) VALUES (?,?,?,?,?)`;

            const params2: any[] = [
                utils.guid(),
                id,
                reqname,
                reqemail,
                'Author',
            ];

            const log1: ILog = this.makeLog(body);
            log1.action = 'newrequest';
            log1.event = 'insert';
            log1.message = 'Inserting Author';

            /** const p2: any = _db2.runStatement(sql2, params2, log1); */

            [err] = await utils.top(_db2.runStatement(sql2, params2, { ...log1 }));
            if (err) {
                return reject({
                    ...err,
                    location: '$requests.ts (insertReqUsers)', //params.location,
                    params2,
                    reason: 'Insert of Author to ESW#REQ_USERS failed',
                    sql2,
                    transid,
                });
            }

            resolve();
        })

    public insertReqLMFS = (insertParams: any, mailtype: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            let t: string = new Date().toISOString();
            t = t.replace('T', ' ');
            t = t.replace('Z', '');

            const log: ILog = this.makeLog(insertParams);
            log.action = 'newrequest';
            log.event = 'insert';
            log.message = 'Inserting New Request from parsed LMFS email';

            const _subject: string = (mailtype === 'lmfs')
                ? (insertParams.SUBJECT).slice((insertParams.SUBJECT).indexOf('Reporting'))
                : insertParams.SUBJECT;
            let strDueDate: any = new Date(insertParams.DUEDATE);
            strDueDate = `${strDueDate.getFullYear()}-${(strDueDate.getMonth() + 1)}-${strDueDate.getDate()}`;

            const sql: string = `INSERT INTO ${utils.Env.k8_db2schema}.ESW#REQ (ID, COUNTRY, CCODE, REQ,
               STATUS,REQTYPE, CREATED, CUSTNAME, DUEDATE, OWNERGR, SUBJ, CUSTID, CHANNEL,BUNIT,BILLAMOUNT,CURR,
               ISO, MARKET, PERIOD, REQFLAG, RELATEDOPPFLAG,ENGAGEMENTOPTION,ENGAGEMENTNUMBER)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            let params: any;
            params = [
                insertParams.ID,
                insertParams.COUNTRY,
                insertParams.CCODE,
                insertParams.REQ.trim(),
                insertParams.STATUS,
                insertParams.REQTYPE,
                t,
                insertParams.CUSTNAME,
                strDueDate,
                insertParams.OWNERGR,
                _subject,
                insertParams.CUSTID,
                'Direct',
                'System Middleware',
                '0',
                insertParams.CURR,
                insertParams.ISO,
                insertParams.MARKET,
                insertParams.PERIOD,
                insertParams.REQFLAG,
                'No',
                'Post Sales Support',
                '',
            ];

            let [err] = await utils.top(_db2.runInsert(sql, params, { ...log }));
            if (err) {
                /** update the couch db
                 * send the params
                 */
                return reject({
                    ...err,
                    location: `${this.fileloc} (insertReqLMFS)`, //params.location,
                    params,
                    reason: 'Insert to ESW#REQ failed',
                    sql,
                    transid: insertParams.TRANSID,
                });
            }

            resolve();

            const guid: any = utils.guid();
            const sql1: string = `INSERT INTO ${utils.Env.k8_db2schema}.ESW#REQ_RELATED (ID, REQID, RELTYPE, VALUE,RELTYPEDISPLAY, FLAG)
               VALUES (?,?,?,?,?,?)`;
            let params1: any;
            params1 = [
                guid,
                insertParams.ID,
                insertParams.RELTYPE,
                insertParams.RELTYPEVALUE,
                insertParams.RELTYPEDISPLAY,
                '1',
            ];

            const log1: ILog = this.makeLog(insertParams);
            log1.action = 'related';
            log1.event = 'insert';
            log1.message = 'Inserting Reqrelated Item';

            [err] = await utils.top(_db2.runInsert(sql1, params1, { ...log1 }));
            if (err) {
                return reject({
                    ...err,
                    location: `${this.fileloc} (insertReqLMFS)`,
                    params: params1,
                    reason: 'Insert to ESW#REQ_RELATED failed',
                    sql,
                    transid: params.transid,
                });
            }

            resolve();
        })

    public makeLog = (body: any): ILog => {

        return {
            action: '',
            created: utils.normalizedDate(),
            createdby: 'abc@company.com',
            createdbyname: 'ES ESW Service',
            event: utils.guid(),
            id: utils.guid(),
            logdb: body.logdb || 'REQ',
            message: '',
            refid: body.ID,
            status: 200,
            transid: body.TRANSID,
            type: 'request',
        };
    }

    public searchReq = (country: string, period: string, custid: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            const sql: string = `SELECT R.ID AS REQID FROM ${utils.Env.k8_db2schema}.ESW#REQ R WHERE R.REQTYPE = 'LMFS Automated Report' AND
              R.CCODE = '${country}' AND R.PERIOD = '${period}' AND R.CUSTID = '${custid}'`;
            const fields: any[] = ['REQID'];

            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                    ...err,
                    location: `${this.fileloc} (searchReq)`, //params.location,
                    params: fields,
                    reason: 'SELECT ID from ESW#REQ failed',
                    sql,
                });
            }

            return resolve(results);
        })

    public searchShopzReq = (reqNo: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            const sql: string = `SELECT R.ID AS REQID FROM ${utils.Env.k8_db2schema}.ESW#REQ R WHERE
             (R.REQTYPE = 'Shopz Entitled Order' OR R.REQTYPE = 'Shopz Order') AND
              R.CCODE = '724' AND  R.REQ = '${reqNo}'`;
            const fields: any[] = ['REQID'];

            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                    ...err,
                    location: `${this.fileloc} (searchShopzReq)`, //params.location,
                    params: fields,
                    reason: `SELECT ID from ESW#REQ WHERE CCODE = 724 AND (REQTYPE = Shopz Order OR Shopz Entitled Order) failed`,
                    sql,
                });
            }

            return resolve(results);
        })

    public searchReqDocs = (country: string, period: string, custid: string, machineserialno: string): Promise<any> =>
        new Promise(async (resolve, reject) => {

            const sql: string = `SELECT R.ID AS REQID, D.ID AS DOCID
            FROM ${utils.Env.k8_db2schema}.ESW#REQ R, ${utils.Env.k8_db2schema}.ESW#REQ_DOCS D WHERE
              R.COUNTRY = '${country}' AND R.PERIOD = '${period}'
              AND R.CUSTID = '${custid}' AND R.ID = D.REQID
              AND REPLACE(D.DESCRIPTION, ' ', '')  LIKE '%${machineserialno}%'`;
            const fields: any[] = ['REQID', 'DOCID'];

            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                    ...err,
                    location: `${this.fileloc} (searchReqDocs)`, //params.location,
                    params: fields,
                    reason: 'SELECT R.ID AS REQID, R.ID AS DOCID from ESW#REQ_DOCS failed',
                    sql,
                });
            }

            return resolve(results);
        })
}
export const requestSQL: RequestSqlFunctions = new RequestSqlFunctions();
