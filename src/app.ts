import * as express        from 'express';
import * as cors           from 'cors';
import * as morgan         from 'morgan';
import * as helmet         from 'helmet';
import * as methodOverride from 'method-override';
import * as swaggerUi      from 'swagger-ui-express';
import * as Joi            from 'joi';

import AudioRoutes from './api/audios';
import VideoRoutes from './api/videos';
import PhotoRoutes from './api/photos';

import APIError from './services/APIError';
import routes from   './api';

import { getErrorResponse } from './api/mainModels';
import mainConfig from './env';
import { idValidation } from './api/mainValidation';
import { generateShareHtml } from './api/product/service';

class Server {
  public app = express();

  constructor() {
    this.config();
    this.routes();
  }

  private config () {
    /** Enabling cross-origin resource sharing */
    this.app.use(cors());
    /** Logging api calls */
    this.app.use(morgan('dev'));
    /** Enabling middleware that parses json */
    this.app.use(express.json(), (err, req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (err && err.status === 400) return res.status(400).send(err.type);
    });
    /** Enabling middleware that parses urlencoded bodies */
    this.app.use(express.urlencoded({ extended: false }));
    /** Enabling method-override */
    this.app.use(methodOverride());
    /** Enabling setting various HTTP headers for security */
    this.app.use(helmet());
    /** Opening media folder */
    this.app.use('/audios', AudioRoutes);
    this.app.use('/videos', VideoRoutes);
    this.app.use('/photos', PhotoRoutes);
    this.app.use('/', express.static(mainConfig.MEDIA_PATH));
    /** Serving swagger documentation */
    const swaggerDoc = require('../swagger.json');
    this.app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  }

  private routes () {

    this.app.get('/', (req: express.Request, res: express.Response) => {
      res.send('ok from INeed');
    });

    this.app.use('/api', routes);

    this.app.get('/:id', async(req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const result = Joi.validate(req.params.id, idValidation.id);
        if (!result.error) {
          const html = await generateShareHtml(req.params.id);
          if (!html) return next();
          res.send(html);
          // $"<html><head><title>{branch.Name}</title><meta name=\"description\" content=\"{branch.VenueDescription}\"><meta name=\"og:image\" content=\"{url}\"></head><body></body><script>if(navigator.userAgent.match(/Android/i))" +
          // "{window.location.href =\"intent:#Intent;action=armboldmind.gogenie.invitation;category=android.intent.category.DEFAULT;category=android.intent.category.BROWSABLE;S.branchId={branch.Id};end\"}else if(navigator.userAgent.match(/iPhone|iPad|iPod/i)){window.location.href =\"gogenielondon://gogenie.io/" +
          // branch.Id + "\";}</script></html>";
        } else {
          return next();
        }
      } catch (e) {
        next(e);
        console.log(e);
      }
    });

    this.app.use((err, req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (!(err instanceof APIError)) {
        new APIError(err, 500, 'Unknown error');
      }
      res.status(500).send(getErrorResponse());
    });

    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(404).json({
        success: false,
        message: 'API not found'
      });
    });

  }
}

export default new Server().app;