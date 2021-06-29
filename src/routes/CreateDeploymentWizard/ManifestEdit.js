import { useState, useEffect } from "react";
import { Box, Typography, Button } from "@material-ui/core";
import { NewDeploymentData } from "../../shared/utils/deploymentUtils";
import { useWallet } from "../../context/WalletProvider";
import MonacoEditor from "react-monaco-editor";
import Alert from "@material-ui/lab/Alert";
import { useHistory } from "react-router";
import { saveDeploymentManifest } from "../../shared/utils/deploymentLocalDataUtils";
import { TransactionMessageData } from "../../shared/utils/TransactionMessageData";
import { useTransactionModal } from "../../context/TransactionModal";
import { useSettings } from "../../context/SettingsProvider";
import { Helmet } from "react-helmet-async";
import { useGA4React } from "ga-4-react";

const yaml = require("js-yaml");

export function ManifestEdit(props) {
  const { settings } = useSettings();
  const [parsingError, setParsingError] = useState(null);
  const { sendTransaction } = useTransactionModal();
  const { address } = useWallet();
  const ga4React = useGA4React();
  const history = useHistory();

  const { editedManifest, setEditedManifest, selectedTemplate } = props;

  async function handleTextChange(value) {
    setEditedManifest(value);
  }

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      await createAndValidateDeploymentData(editedManifest, "TEST_DSEQ_VALIDATION");
    }, 500);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [editedManifest]);

  async function createAndValidateDeploymentData(yamlStr, dseq) {
    try {
      const doc = yaml.load(yamlStr);

      const dd = await NewDeploymentData(settings.apiEndpoint, doc, dseq, address);
      validateDeploymentData(dd);

      setParsingError(null);

      return dd;
    } catch (err) {
      if (err.name === "YAMLException") {
        setParsingError(err.message);
      } else if (err.name === "TemplateValidation") {
        setParsingError(err.message);
      } else {
        setParsingError("Error while parsing SDL file");
        console.error(err);
      }
    }
  }

  const options = {
    selectOnLineNumbers: true,
    scrollBeyondLastLine: false,
    minimap: {
      enabled: false
    }
  };

  function handleDocClick(ev) {
    ev.preventDefault();

    window.electron.openUrl("https://docs.akash.network/documentation/sdl");
  }

  function validateDeploymentData(deploymentData) {
    if (selectedTemplate.valuesToChange) {
      for (const valueToChange of selectedTemplate.valuesToChange) {
        if (valueToChange.field === "accept") {
          const serviceNames = Object.keys(deploymentData.sdl.services);
          for (const serviceName of serviceNames) {
            if (deploymentData.sdl.services[serviceName].expose?.some((e) => e.accept?.includes(valueToChange.initialValue))) {
              let error = new Error(`Template value of "${valueToChange.initialValue}" needs to be changed`);
              error.name = "TemplateValidation";

              throw error;
            }
          }
        }
      }
    }
  }

  async function handleCreateClick() {
    const dd = await createAndValidateDeploymentData(editedManifest, null);

    if (!dd) return;

    try {
      const message = TransactionMessageData.getCreateDeploymentMsg(dd);
      const response = await sendTransaction([message]);

      if (response) {
        saveDeploymentManifest(dd.deploymentId.dseq, editedManifest, dd.version, address);

        history.push("/createDeployment/acceptBids/" + dd.deploymentId.dseq);

        ga4React.event("create deployment");
      }
    } catch (error) {
      throw error;
    }
  }

  function handleChangeTemplate() {
    history.push("/createDeployment/chooseTemplate");
  }

  return (
    <>
      <Helmet title="Create Deployment - Manifest Edit" />

      <Box pb={2}>
        <Typography>
          You may use the sample deployment file as-is or modify it for your own needs as desscribed in the{" "}
          <a href="#" onClick={handleDocClick}>
            SDL (Stack Definition Language)
          </a>{" "}
          documentation. A typical modification would be to reference your own image instead of the demo app image.
        </Typography>
        <MonacoEditor height="600" language="yaml" theme="vs-dark" value={editedManifest} onChange={handleTextChange} options={options} />
      </Box>
      {parsingError && <Alert severity="warning">{parsingError}</Alert>}

      <Box pt={2}>
        <Button onClick={handleChangeTemplate}>Change Template</Button>&nbsp;
        <Button variant="contained" color="primary" disabled={!!parsingError} onClick={handleCreateClick}>
          Create Deployment
        </Button>
      </Box>
    </>
  );
}