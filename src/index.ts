import * as http         from 'http';
import * as mongoose     from 'mongoose';
import * as bluebird     from 'bluebird';
import * as socketServer from 'socket.io';

import app from './app';
import mainConfig from './env';
import runSeed from './seed';
import socketHandler from './socketServer';
import { mainScheduler } from './scheduler';
import { socketEventKeys } from './constants/constants';

bluebird.promisifyAll(mongoose);
(<any>mongoose).Promise = bluebird;

// connect to mongo db
mongoose.connect(mainConfig.MONGO_URL, { useNewUrlParser: true }, async () => {
  console.log('Mongodb connected on port 27017');
  runSeed();
});
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

// listen on port
const server = http.createServer(app).listen(mainConfig.PORT, () => {
  console.log('Server started on port ' + mainConfig.PORT + ` in ${mainConfig.NODE_ENV} mode`);
});

const io = socketServer.listen(server);

io.on(socketEventKeys.connection, (socket) => {
  socketHandler(socket).catch(e => console.log(e));
});

mainScheduler();

export default server;