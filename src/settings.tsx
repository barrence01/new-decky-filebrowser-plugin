import { useContext, useCallback, useEffect, useState } from "react";
import {
  ButtonItem,
  TextField,
  PanelSection,
  PanelSectionRow,
  ScrollPanel
} from "decky-frontend-lib";
import { AppContext } from "./utils/app-context";

const Settings = () => {
  // @ts-ignore
  const { fileBrowserManager } = useContext(AppContext);
  const [port, setPort] = useState( null );
  const [username, setUsername] = useState( null );
  const [password, setPassword] = useState( null );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invalidPortError, setInvalidPortError] = useState(false);
  const [invalidUsernameError, setInvalidUsernameError] = useState(false);
  const [invalidPasswordError, setInvalidPasswordError] = useState(false);
  const [portErrorMessage, setPortErrorMessage] = useState("");
  const [portSuccessMessage, setPortSuccessMessage] = useState("");
  const [usernamePasswordErrorMessage, setUsernamePasswordErrorMessage] = useState("");
  const [usernamePasswordSuccessMessage, setUsernamePasswordSuccessMessage] = useState("");

  const handleSavePort = useCallback(async () => {

    if(!port) {
      showError("port", "The field cannot be empty.");
      setInvalidPortError(true);
      return;
    }

    setIsSaving(true);
    if(!invalidPortError) {
      await fileBrowserManager.setPort(+port);
      showSuccess("port", "Port number saved successfully.");
    }
    
    setIsSaving(false);
  }, [port, invalidPortError]);

  const handleSaveUsernamePassword = useCallback(async () => {

    if(!username && !password) {
      showError("usernameAndPassword", "The fields cannot be empty.");
      return;
    }
    if(!username) {
      showError("usernameAndPassword", "The username field cannot be empty.");
    }

    if(!password) {
      showError("usernameAndPassword", "The password field cannot be empty.");
    }

    if(!username || !password) {
      return;
    }

    setIsSaving(true);
    if(!invalidUsernameError && !invalidPasswordError) {
      const result = await fileBrowserManager.saveUsernamePassword(username, password);

      if(result == "success"){
        showSuccess("usernameAndPassword", "Credentials changed successfully.");
        return;
      }
      showError("usernameAndPassword", "Could not save credentials, check the logs for more details.");
    }
    
    setIsSaving(false);
  }, [username, password, invalidUsernameError, invalidPasswordError]);

  const handlePortChange = (e) => {
    setPort(e.target.value);
    showError("port", "");
    setInvalidPortError(true);

    if(!e.target.value) {
      return;
    }

    if (e.target.value.length > 5) {
      setPort(e.target.value.substring(0, 5));
    }

    const isNumeric = !isNaN(+e.target.value)
    if (!isNumeric) {
      showError("port", "The port number must be numeric.")
      return;
    }
    const portNumber = +e.target.value;

    // Decky uses port 1337
    if (portNumber == 1337) {
      showError("port", "The port number 1337 cannot be used because it's already being used by decky.")
      return;
    }

    // To use a port equal or lower than 1024 on Linux, you need root access
    if(portNumber < 1024) {
      showError("port", "The port number must be higher than 1024.")
      return;
    }
    if(portNumber > 65535) {
      showError("port", "The port number must be lower than 65536.")
      return;
    }

    setInvalidPortError(false);
  };

  const handleUsernameChange = (e) => {
    handleUsernamePasswordChange("username", setUsername, setInvalidUsernameError, e.target.value)
  };

  const handlePasswordChange = (e) => {
    handleUsernamePasswordChange("password", setPassword, setInvalidPasswordError, e.target.value)
  };

  const handleUsernamePasswordChange = (field: string, setCallback: any, setInvalidCallback: any, fieldValue: any) => {
    setCallback(fieldValue);
    showError("usernameAndPassword", "");
    setInvalidCallback(true);

    if(!fieldValue) {
      return;
    }
    const formValue = fieldValue.trim()

    if (formValue.length > 20) {
      setCallback(formValue.substring(0, 20));
      return;
    }

    if (formValue.length < 4) {
      showError("usernameAndPassword", "The " + field + " length can't be less than 4 characters.")
      return;
    }

    if (!isValidForShell(formValue)) {
      showError("usernameAndPassword", "The " + field + "cannot have the following characters: ;, |, &, >, <, \, *, ', `," + '".')
      return;
    }

    setInvalidCallback(false);
  };

  const isValidForShell = (input: string) => {
    const invalidChars = /[;&|><`'"\\$*?{}()\[\]\n\r]/;
    return !invalidChars.test(input);
  }

  const showError = (field: string, message: string) => {

    switch(field) {
      case "port":
        setPortSuccessMessage("");
        setPortErrorMessage(message);
        break;
      case "usernameAndPassword":
        setUsernamePasswordSuccessMessage("");
        setUsernamePasswordErrorMessage(message);
        window.scrollBy({ top: -30, behavior: 'smooth' });
        break;
      default:
        break;
    }
  };

  const showSuccess = (field: string, message: string) => {

    switch(field) {
      case "port":
        setPortErrorMessage("");
        setPortSuccessMessage(message);
        setTimeoutClearMessage(setPortSuccessMessage);
        break;
      case "usernameAndPassword":
        setUsernamePasswordErrorMessage("");
        setUsernamePasswordSuccessMessage(message);
        setTimeoutClearMessage(setUsernamePasswordSuccessMessage);
        break;
      default:
        break;
    }
  };

  const setTimeoutClearMessage = (functionCallback: any) => {
    setTimeout(() => { 
      functionCallback("");
    }, 3000);
  }

  useEffect(() => {
    const loadDefaults = async () => {
      setIsLoading(true);
      const _port = await fileBrowserManager.getPortFromSettings();
      setPort(_port);
      const _username = await fileBrowserManager.getUsernameFromSettings();
      setUsername(_username);
      setIsLoading(false);
    };

    loadDefaults();  
  }, []);

  return (
    <ScrollPanel style={{ marginTop: "50px", marginBottom: "30px", color: "white" }}>
      
        {isLoading ? (
              <div style={{ textAlign: "center" }}>
                <h2>Loading...</h2>
              </div>
        ) : (
            <PanelSection title="File Browser options" style={{ marginTop: "100px", marginBottom: "30px", color: "white"}}>
              <PanelSectionRow>
                <TextField
                  label="Port"
                  description="TCP port used for connection. The port number 1337 cannot be used because of decky."
                  onChange={handlePortChange}
                  value={port}
                  style={{
                    border: invalidPortError ? "1px red solid" : undefined, marginBottom: "0px"
                  }}
                />
                {portErrorMessage && (
                  <div style={{ color: 'red', fontWeight: '300' }}>
                    {portErrorMessage}
                  </div>
                )}
                {portSuccessMessage && (
                  <div style={{ color: 'green', fontWeight: 'bold' }}>
                    {portSuccessMessage}
                  </div>
                )}
                <PanelSectionRow>
                  <ButtonItem onClick={handleSavePort} disabled={isSaving}>
                    Save
                  </ButtonItem>
                </PanelSectionRow>
              </PanelSectionRow>

              <PanelSectionRow>
                <TextField
                  label="Username"
                  description="Set the username for the file browser."
                  onChange={handleUsernameChange}
                  value={username}
                  style={{
                    border: invalidUsernameError ? "1px red solid" : undefined
                  }}
                />
              </PanelSectionRow>

              <PanelSectionRow>
                <TextField
                  label="Password"
                  description="Set the password for the file browser."
                  onChange={handlePasswordChange}
                  value={password}
                  style={{
                    border: invalidPasswordError ? "1px red solid" : undefined
                  }}
                />
                {usernamePasswordErrorMessage && (
                  <div style={{ color: 'red', fontWeight: '300' }}>
                    {usernamePasswordErrorMessage}
                  </div>
                )}
                {usernamePasswordSuccessMessage && (
                  <div style={{ color: 'green', fontWeight: 'bold' }}>
                    {usernamePasswordSuccessMessage}
                  </div>
                )}
                <PanelSectionRow>
                  <ButtonItem onClick={handleSaveUsernamePassword} disabled={isSaving}>
                    Save
                  </ButtonItem>
                </PanelSectionRow>
              </PanelSectionRow>
            </PanelSection>
        )}
    </ScrollPanel>
  );
};

export default Settings;
