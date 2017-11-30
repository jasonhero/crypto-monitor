import axios, { AxiosRequestConfig, AxiosPromise } from "axios";
import * as uuid from "uuid/v1";

 /*
 - Pull all markets from db
 - Request each market endpoint for a ticker snapshot
 - Add db entry for market ticker snapshot
 - wait a certain amount of time
 - repeat process
 */


class TickerRequester {
  endpoint_url: string;
  lastRequestTimestamp: number;
  isRequesting: boolean;
  constructor(endpoint_url: string) {
    this.endpoint_url = endpoint_url;

    this.isRequesting = false;
    this.lastRequestTimestamp = 0;
  }

  setRequesting(): void {
    this.isRequesting = true;
  }

  doneRequesting(): void {
    this.isRequesting = false;
    this.resetTime();
  }

  currentlyRequesting(): boolean {
    return this.isRequesting;
  }

  timeSinceRequest(): number {
    return Date.now() - this.lastRequestTimestamp;
  }

  resetTime(): void {
    this.lastRequestTimestamp = Date.now();
  }

  getEndpoint(): string {
    return this.endpoint_url;
  }
}


class TickerManager {
  requesters: Array<TickerRequester>;
  constructor() {
    this.requesters = [];
  }

  addEndpoint(endpoint_url: string): void {
    this.requesters.push(new TickerRequester(endpoint_url));
  }

  removeEndpoint(endpoint_url: string): void {
    this.requesters = this.requesters.filter((requester) => requester.getEndpoint() !== endpoint_url);
  }

  getStaleRequester(minTime: number): TickerRequester {
    return this.requesters.reduce((oldest, current) => {
      // Don't check requests in mid-flight or requests that haven't surpassed the minimum time frame
      const currentTime = current.timeSinceRequest();
      if (current.currentlyRequesting() || currentTime < minTime) {
        return oldest;
      }

      if (!oldest) return current;

      if (currentTime > oldest.timeSinceRequest()) {
        return current;
      }
      return oldest;
    }, undefined);
  }
}

class TickerRunner {
  manager: TickerManager;
  maxConcurrentRequests: number;
  requestRepeatInterval: number;
  activeRequests: Map<String, TickerRequester>;
  constructor(manager: TickerManager, requestRepeatInterval = 1500, maxRequests = 20) {
    this.manager = manager;

    this.maxConcurrentRequests = maxRequests;
    this.requestRepeatInterval = requestRepeatInterval;
    this.activeRequests = new Map();
  }

  releaseRequest(requestUuid: string): void {
    const tickerRequester = this.activeRequests.get(requestUuid);
    tickerRequester.doneRequesting();
    this.activeRequests.delete(requestUuid);
  }

  openRequest(tickerRequester: TickerRequester): string {
    const id = uuid();
    tickerRequester.setRequesting();
    this.activeRequests.set(id, tickerRequester);
    return id;
  }

  async makeRequest(tickerRequester: TickerRequester) {
    const id = this.openRequest(tickerRequester);
    try {
      const response = await axios.get(tickerRequester.getEndpoint());
      console.log(response, "response");
    } catch (e) {
      console.log(e, "Error requesting");
    }
    finally {
      this.releaseRequest(id);
    }
  }

  start() {
    setTimeout(() => {
      if (this.activeRequests.size < this.maxConcurrentRequests) {
        const staleRequester = this.manager.getStaleRequester(this.requestRepeatInterval);
        if (staleRequester) {
          this.makeRequest(staleRequester);
        }
      }
      this.start();
    }, 0);
  }
}

async function runner() {
  const tickerManager = new TickerManager();
  tickerManager.addEndpoint("https://api.gdax.com/products/BTC-USD/ticker");

  const tickerRunner = new TickerRunner(tickerManager);

  tickerRunner.start();
}

runner();