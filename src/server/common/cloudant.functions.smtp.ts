
import { cloudantext as cloudant } from './cloudant';
class CoucheFunctions {

    constructor() {    /** */ }

    public insert = (db: string, body: any, id: string): Promise<any> =>

        new Promise((resolve, reject) => {

            cloudant.db.use(db)
                .insert(body, id)
                .then(() => {
                    resolve(id);
                })
                .catch((err: Error) => {
                    reject(err);
                });

        })
    // `test
    public getDoc = (db: string, id: string): Promise<any> => {

        return new Promise((resolve, reject) => {

            cloudant.db.use(db)
                .get(id)
                .then((body: any) => {
                    resolve(body);
                })
                .catch((err: Error) => {
                    return reject(err);
                });
        });

    }

    public guid = () => {
        const _p8: any = (s: boolean) => {
            const p: string = (`${Math.random().toString(16)}000000000`).substr(2, 8);

            return s
                ? `-${p.substr(0, 4)}-${p.substr(4, 4)}`
                : p;
        };
        const t: string = _p8(false) + _p8(true) + _p8(true) + _p8(false);

        return t.toLowerCase();
    }

    public generatefileID = () => {
        const addZero: any = (i: any) => {
            return i < 10
                ? `0${i}`
                : i;
        };
        const now: Date = new Date();
        const year: any = now.getFullYear();
        const month: any = addZero((now.getMonth() + 1));
        const day: any = now.getDate();
        const hour: number = addZero(now.getHours());
        const min: number = addZero(now.getMinutes());
        const sec: number = addZero(now.getSeconds());
        const timestr: string = `${year.toString()}-${month.toString()}-${day.toString()}-` +
            `${hour.toString() + min.toString() + sec.toString()}`;

        return (timestr);
    }

}

export const _couchesmtp: CoucheFunctions = new CoucheFunctions();
