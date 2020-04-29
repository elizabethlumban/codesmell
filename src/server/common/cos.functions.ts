
import { cos } from './cos';
import { utils } from './utils';

class CosFunctions {

    public s3Upload: (Key: string, Body: Buffer | string, Metadata: {}, Bucket: string) =>
        Promise<any> = (Key: string, Body: Buffer | string, Metadata: {}, Bucket: string): Promise<any> =>

            new Promise(async (resolve, reject) => {

                const params: AWS.S3.PutObjectRequest = {
                    Body,
                    Bucket,
                    Key,
                    Metadata,
                };
                const options: AWS.S3.ManagedUpload.ManagedUploadOptions = { partSize: 10 * 1024 * 1024, queueSize: 1 };

                const upload: AWS.S3.ManagedUpload = cos.upload(params, options);

                const promise: Promise<any> = upload.promise();

                promise
                    .then((data: AWS.S3.Object) => {
                        utils.log(`$cos.functions (s3Uplaod): uploaded ${data.ETag} `);
                        resolve(data);
                    })
                    .catch((err: Error) => {
                        utils.logError('$cos.functions (s3Uplaod): error in upload', err);
                        reject(err);
                    });

            })

    public downLoad: (Key: string, Bucket: string) => Promise<any> = (Key: string, Bucket: string): Promise<any> =>

        new Promise(async (resolve, reject) => {

            cos.getObject({
                Bucket,
                Key,
            },
                (err: AWS.AWSError, response: AWS.S3.GetObjectOutput) => {

                    if (err) {
                        return reject(err);
                    }
                    resolve(response);
                });
        })

}

export const cosFunctions: CosFunctions = new CosFunctions();
