import * as cluster from 'cluster';
import { cpus } from 'os';

class StartCluster {

    private cpu: number;

    constructor() {
        this.cpu = cpus().length;

        process.env.UV_THREADPOOL_SIZE = Math.ceil(Math.max(4, this.cpu * 1.5)).toString();
        const msg: string = `$app (startup): running with threadpool ${process.env.UV_THREADPOOL_SIZE}`;
        console.info(msg);
    }

    public start = () => {
        cluster.setupMaster({
            exec: './server/server.js',
        });

        if (cluster.isMaster) {
            if (process.env.NODE_ENV === 'development') {
                cluster.fork();
            } else {
                for (let i: number = 0; i < this.cpu; i++) {
                    // Create a worker
                    setTimeout(() => {
                        cluster.fork();
                    }, 1000 * i);
                }
            }

            cluster.on('exit', (worker: any, code: any, signal: any) => {
                console.info(`$app (cluster): worker ${worker.pid} died with code: ${code} and signal ${signal}`);
                cluster.fork();
            });

        }
    }

}

export const server: any = new StartCluster();
