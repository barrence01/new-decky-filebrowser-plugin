import { useContext, useCallback, useEffect, useState } from "react";
import {
  ButtonItem,
  TextField,
  PanelSection,
  PanelSectionRow,
} from "decky-frontend-lib";
import { AppContext } from "./utils/app-context";

const Settings = () => {
  // @ts-ignore
  const { fileBrowserManager } = useContext(AppContext);
  const [port, setPort] = useState( null );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invalidPortError, setInvalidPortError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSave = useCallback(async () => {

    if(!port) {
      showError("The field cannot be empty.")
      return;
    }

    setIsSaving(true);
    if(!invalidPortError) {
      await fileBrowserManager.setPort(+port);
      showSuccess("Port Number saved successfully.");
    }
    
    setIsSaving(false);
  }, [port, invalidPortError]);

  const handlePortChange = (e) => {
    setPort(e.target.value);
    showError("");
    setInvalidPortError(true);

    if(!e.target.value) {
      return;
    }

    if (e.target.value.length > 5) {
      setPort(e.target.value.substring(0, 5));
    }

    const isNumeric = !isNaN(+e.target.value)
    if (!isNumeric) {
      showError("The field must be numeric.")
      return;
    }
    const portNumber = +e.target.value;

    // Decky uses port 1337
    if (portNumber == 1337) {
      showError("The port number 1337 cannot be used because it's already being used by decky.")
      return;
    }

    // To use a port equal or lower than 1024 on Linux, you need root access
    if(portNumber < 1024) {
      showError("The port number must be higher than 1024.")
      return;
    }
    if(portNumber > 65535) {
      showError("The port number must be lower than 65536.")
      return;
    }

    setInvalidPortError(false);
  };

  const showError = (message: string) => {
    setSuccessMessage("");
    setErrorMessage(message);
  };

  const showSuccess = (message: string) => {
    setErrorMessage("");
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  useEffect(() => {
    const loadDefaults = async () => {
      setIsLoading(true);
      const _port = await fileBrowserManager.getPortFromSettings();
      setPort(_port);
      setIsLoading(false);
    };

    loadDefaults();  
  }, []);

  return (
    <div style={{ marginTop: "50px", color: "white" }}>
      {isLoading ? (
        <div style={{ textAlign: "center" }}>
          <h2>Loading...</h2>
        </div>
      ) : (
        <PanelSection title="File Browser options">
          <PanelSectionRow>
            <TextField
              label="Port"
              description="TCP port used for connection. The port number 1337 cannot be used because of decky."
              onChange={handlePortChange}
              value={port}
              style={{
                border: invalidPortError ? "1px red solid" : undefined,
              }}
            />
            {errorMessage && (
              <div style={{ color: 'red', fontWeight: '300' }}>
                {errorMessage}
              </div>
            )}
            {successMessage && (
            <PanelSectionRow>
              <div style={{ color: 'green', fontWeight: 'bold' }}>
                {successMessage}
              </div>
            </PanelSectionRow>
            )}
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem onClick={handleSave} disabled={isSaving}>
              Save
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      )}
    </div>
  );
};

export default Settings;
