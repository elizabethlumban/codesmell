import { cosFunctions } from '../../common/cos.functions';
import { utils } from '../../common/utils';

export interface IDB2File {
    file: any;
    hostid: string;
    id: string;
    reqid: string;
}

export interface ICosFileMeta {
    transid: string;
    reqid: string;
    created: string;
}
export interface ICosFile {
    fileid: string;
    Body: any;
    MetaData: ICosFileMeta;
}

export interface ICosReturn extends AWS.S3.Object {
    fileid: string;
}

class DB2Doc {
    constructor() {/* */ }

    public cosUpload = (params: ICosFile): Promise<ICosReturn> =>

        new Promise((resolve, reject) => {

            const hrstart: any = process.hrtime();
            cosFunctions
                .s3Upload(
                    params.fileid,
                    params.Body,
                    params.MetaData,
                    `es-esw-req-docs-${utils.Env.k8_system}`,
            )
                .then((data: AWS.S3.Object) => resolve({ ...data, fileid: params.fileid }))
                .catch((err: Error) => {
                    utils.logError(`$db2.docs.ts (cosUpload)`, err);

                    reject(err);
                });

            utils.logInfo('$db2.doc (cosUpload)', 'addFile', process.hrtime(hrstart));

        })

}

export const db2doc: DB2Doc = new DB2Doc();
