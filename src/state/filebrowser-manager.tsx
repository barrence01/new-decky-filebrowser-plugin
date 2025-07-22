import { call, callable } from "@decky/api";
export default class FileBrowserManager {
  public call: typeof call<any[this], any>;
  public callable: typeof callable<any[this], any>;
  private port: Number = 8082;
  private pid: Number = -1;
  private ipv4_address: string = "";
  private runStatus: boolean = false;

  constructor() {
    this.call = call;
    this.callable = callable;
    this.runStatus = false;
    this.port = 8082;
  }

  isServerRunning(): boolean {
    return this.runStatus;
  }

  getPort() {
    return this.port;
  }

  async getPortFromSettings() {
    const result = await this.call("get_setting", "port");

    if ( result ) {
      this.port =  Number(result);
      return this.getPort();
    } else {
      return this.getPort();
    }
  }

  async getUsernameFromSettings() {
    const result = await this.call("get_setting", "currentUsername");

    if ( result ) {
      return result;
    } else {
      return "";
    }
  }

  async setPort(port: Number) {
    const result = await this.call("save_user_settings", "port", port);

    if ( result ) {
      this.port =  Number(result);
      return this.getPort();
    } else {
      return this.getPort();
    }
  }

  async getFileBrowserStatus() {
    const result = await this.call("getFileBrowserStatus");

    if (result?.status == "online" ) {
      this.port = Number(result?.port);
      this.ipv4_address = String(result?.ipv4_address);
      this.pid = Number(result?.pid);
      this.runStatus = true;

      return result?.status;
    } else {
      this.port = Number(result?.port);
      this.runStatus = false;

      return result?.status;
    }
  }

  getIPV4Address() {
    return this.ipv4_address;
  }

  getPID() {
    return this.pid;
  }

  async startFileBrowser() {
    return await this.call("startFileBrowser", this.getPort());
  }

  async stopFileBrowser() {
    return await this.call("stopFileBrowser");
  }

  async saveUsernamePassword(newUsername: string, newPassword: string) {
    try{
      const result = await this.call("save_username_password", newUsername, newPassword);
      
      return result?.output;
    } catch (error) {
      return "failed";
    }
  }

  async resetSettings() {
    try{
      await this.call("reset_settings");
      return "success";
    } catch (error) {
      return "failed";
    }
  }

  async fileBrowserSendLogInfo( text: string ) {
    return await this.call("logInfo", "Javascript: " + text);
  }

  async fileBrowserSendLogError( text: string ) {
    return await this.call("logError", "Javascript: " + text);
  }
}
