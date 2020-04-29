import { Database, db2config, Pool } from './db2config';
import { default as each } from 'lodash-es/each';
import { utils } from './utils';
import { ILog, IMQLogBase, mq } from './rabbitmq';

interface IDB2Error extends Error {
    sql: string;
    bindings?: any[];
    params?: {};
}

interface IDB2 {
    db2: Pool;
    connString: string;
    runQuery(sql: any, fields: any, bindings?: any[], log?: string): Promise<any>;
    runStatement(sql: string, params?: undefined | {} | null, log?: ILog): Promise<any>;
    fillArray(value: string, len: number): any[];
    fillArray(value: string, len: number): any[];
    _cu(i: string): string;
    _cl(i: string): string;
}

class DB2Functions implements IDB2 {

    public db2: Pool;
    public connString: string;
    private counter: number;
    private internalMsg = 'Internal Error Happened';
    private success: boolean = true;

    constructor() {
        this.connString = db2config.conn.connString;
        this.db2 = db2config.conn.ibmdb;
        this.db2.init(5, this.connString);
        this.counter = 0;
    }

    public runQuery: IDB2['runQuery'] =
        (sqlIn: string, fields: any, bindings?: any[], log?: string): Promise<any> => new Promise((resolve, reject) => {

            const sql: string = sqlIn.replace(/\n/gm, '');

            const title: string = log ? log : '';

            this.db2.open(this.connString, (err: any, conn: Database) => {

                if (err) {
                    this.db2.close(() => {
                        utils.logError(`$db2.functions (runQuery db2open): closing db2 pool`, err);
                    });

                    return reject(err);
                }

                if (!conn.connected) {
                    utils.logInfo(`$db2.function (runQuery): rejecting ${title}`);

                    return reject({
                        error: true,
                        message: this.internalMsg,
                    });
                }

                this.counter = this.counter + 1;
                utils.logInfo(`$db2.function (runQuery): starting ${title} - sqlc: ${this.counter}`);

                conn
                    .query(sql, bindings)
                    .then((data: any) => {
                        conn.close();
                        this.counter = this.counter - 1;
                        utils.logInfo(`$db2.function (runQuery): completed ${title} - sqlc: ${this.counter}`);

                        this.success = true;
                        resolve(this.final(fields, data));
                    })
                    .catch((error: IDB2Error): void => {
                        conn.close();
                        this.counter = this.counter - 1;
                        utils.logInfo(`$db2.function (runQuery): errored ${title} - sqlc: ${this.counter}`);

                        if (!this.success) {
                            //* source is permenantely down */
                            utils.logInfo(`$db2.function (runQuery): errored after SQL30081N retry ${title} - sqlc: ${this.counter}`);

                            return reject(error);
                        }

                        if (error.message && error.message.includes('SQL30081N')) {

                            utils.logInfo(`$db2.functions (runQuery): SQL30081N detected closing pool and retrying`);

                            this.db2.close(() => {

                                //* reset the pool */
                                this.db2.availablePool = {};

                                //* reinit the pool */
                                const init: boolean = this.db2.init(5, this.connString);

                                if (init) {
                                    this.success = false;
                                    this.runQuery(sql, fields, bindings, log)
                                        .then((data: any) => resolve(data))
                                        .catch((errorf: Error) => reject(errorf));
                                } else {
                                    utils.logInfo(`$db2.function (runQuery): init error ${title} - sqlc: ${this.counter}`);
                                    reject(error);
                                }
                            });
                        } else {
                            utils.logInfo(`$db2.function (runQuery): errored ${title} - sqlc: ${this.counter}`);
                            error.sql = sql;
                            error.bindings = bindings;
                            reject(error);
                        }

                    });

            });
        })

    public runStatement: IDB2['runStatement'] =
        (sqlIn: string, params?: {}, log?: ILog): Promise<any> =>

            new Promise((resolve, reject) => {

                const sql: string = sqlIn.replace(/\n/gm, '');

                const title: string = log ? log.action : '';
                const processid: string = utils.guid();

                this.db2.open(this.connString, (err: Error, conn: any) => {
                    if (err) {
                        this.db2.close(() => {
                            utils.logInfo(`$db2.functions (runStatement) : closing pool - pi: ${processid}`);
                        });

                        return reject(err);
                    }

                    if (!conn.connected) {
                        utils.logInfo(`$db2.function (Query): rejecting ${title} - pi: ${processid}`);

                        return reject({
                            error: true,
                            message: this.internalMsg,
                        });
                    }

                    conn.prepare(sql, (error: Error, stmt: any) => {

                        if (error) {
                            conn.closeSync();

                            return reject(error);
                        }
                        this.counter = this.counter + 1;
                        utils.logInfo(`$db2.function (Statement): starting ${title} - sqlc: ${this.counter} - pi: ${processid}`);
                        stmt.execute(params, (preperror: IDB2Error, result: any) => {

                            if (preperror) {
                                conn.closeSync();

                                utils.logError('$db2.functions (Statement Error)', error, sql, params);
                                this.counter = this.counter - 1;
                                utils.logInfo(`$db2.function (Statement): completed ${title} - sqlc: ${this.counter} - pi: ${processid}`);

                                preperror.sql = sql;
                                preperror.params = params;

                                return reject(preperror);
                            } else {
                                result.closeSync();
                            }

                            stmt.closeSync();
                            conn.close(() => {
                                return;
                            });
                            this.counter = this.counter - 1;
                            utils.logInfo(`$db2.function (Statement): completed ${title} - sqlc: ${this.counter} - pi: ${processid}`);

                            if (log) {
                                log.id = processid;
                                const logapi: IMQLogBase = {
                                    channel: 'statement.db2log',
                                    log: {
                                        log,
                                        sql: {
                                            params,
                                            sql,
                                        },
                                    },
                                };
                                utils.logInfo(`$db2.function (Statement): sending to rabbit - pi: ${processid}`);
                                mq.logMsg(logapi);
                            }

                            resolve(true);
                        });
                    });
                });
            })

    public runInsert = (sql: any, params: any, log?: ILog): Promise<any> => {

        return new Promise((resolve, reject) => {
            this.db2.open(this.connString, (err: Error, conn: any) => {
                if (err) {
                    return reject({ message: err });
                }
                conn.prepare(sql, (error: Error, stmt: any) => {
                    if (error) {
                        conn.closeSync();

                        return reject({ message: error });
                    }
                    stmt.execute(params, (execerror: Error, result: any) => {
                        if (execerror) {
                            conn.closeSync();

                            return reject({ message: execerror });
                        } else {
                            result.closeSync();
                        }
                        conn.close(() => {
                            return;
                        });
                        if (log) {
                            log.id = utils.guid();
                            const logapi: IMQLogBase = {
                                channel: 'statement.db2log',
                                log: {
                                    log,
                                    sql: {
                                        params,
                                        sql,
                                    },
                                },
                            };
                            utils.logInfo(`$db2.function (Statement): sending to rabbit`);
                            mq.logMsg(logapi);
                        }
                        resolve(true);
                    });
                });
            });
        });
    }

    public _cu: any = (i: string): string => {
        return i.toUpperCase();
    }

    public fillArray = (value: string, len: number) => {
        const arr: any[] = [];
        for (let i: number = 0; i < len; i++) {
            arr.push(value);
        }

        return arr;
    }
    public final: any = (fields: any, data: any) => {
        const list: any = data.map((item: any) => {
            const obj: { [index: string]: any } = {};
            each(fields, (m: any) => {
                const fld: any = this._cu(m);

                obj[this._cl(fld)] = fld.startsWith('M_')
                    ? JSON.parse(item[fld])
                    : item[fld];

            });

            return obj;
        });

        return (list);
    }

    public _cl: any = (i: string): string => {
        return i.toLowerCase();
    }

}

export const _db2: DB2Functions = new DB2Functions();
