import { ServerAPI } from 'decky-frontend-lib';
export default class FileBrowserManager {
  private port: Number;
  private pid: Number;
  private ipv4_address: string;
  private serverAPI: ServerAPI;
  private runStatus: boolean;

  // @ts-ignore
  private setServer(serv: ServerAPI): void {
    this.serverAPI = serv;
  }

  constructor(serverAPI: ServerAPI) {
    this.serverAPI = serverAPI;
    this.runStatus = false;
    this.port = 8082;
  }

  getServer(): ServerAPI {
    return this.serverAPI;
  }

  isServerRunning(): boolean {
    return this.runStatus;
  }

  async getUserSettings() {
    const result = await this.serverAPI.callPluginMethod("get_user_settings", {});

    if ( result.success ) {
      return result.result;
    } else {
      return new Error(result.result);
    }
  }

  getPort() {
    return this.port;
  }

  async getPortFromSettings() {
    const result = await this.serverAPI.callPluginMethod("get_setting", { key: "port" });

    if ( result.success ) {
      this.port = result.result as Number;
      return;
    } else {
      return new Error( result.result as string );
    }
  }

  async setPort(port: Number) {
    const result = await this.serverAPI.callPluginMethod("save_user_settings", { key: "port", value: port });

    if ( result.success ) {
      this.port = result.result as Number;
      return;
    } else {
      return new Error( result.result as string );
    }
  }

  async getFileBrowserStatus() {
    const result = await this.serverAPI.callPluginMethod("getFileBrowserStatus");

    if ( result.result?.status == "online" ) {
      this.port = result.result?.port as Number;
      this.ipv4_address = result.result?.ipv4_address as string;
      this.pid = result.result?.pid as Number;
      this.runStatus = true;

      return result.result?.status;
    } else {
      this.port = result.result?.port as Number;
      this.runStatus = false;

      return result.result?.status;
    }
  }

  getIPV4Address() {
    return this.ipv4_address;
  }

  getPID() {
    return this.pid;
  }

  async startFileBrowser() {
    return await this.serverAPI.callPluginMethod("startFileBrowser", {
      port: this.getPort()
    });
  }

  async stopFileBrowser() {
    return await this.serverAPI.callPluginMethod("stopFileBrowser");
  }

  async fileBrowserSendLogInfo( text: string ) {
    return await this.serverAPI.callPluginMethod("logInfo", { msg: "Javascript:" + text });
  }

  async fileBrowserSendLogError( text: string ) {
    return await this.serverAPI.callPluginMethod("logError", { msg: "Javascript:" + text });
  }
}
