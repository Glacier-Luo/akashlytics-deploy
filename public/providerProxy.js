const path = require("path");

const { nanoid } = require("nanoid");

let child = null;
function spawnProxy() {
  const spawn = require("child_process").spawn;

  const dir = __dirname.replace("asar", "asar.unpacked");
  const command = path.join(dir, getProxyFilePath());

  console.log(command);
  const parameters = [];

  child = spawn(command, parameters, {
    stdio: ["pipe", "pipe", "pipe", "ipc"]
  });

  child.on("message", (response) => {
    requestResponses[response.id] = response;
  });
}
spawnProxy();

let requestResponses = [];

async function makeRequest(url, method, body, certPem, keyPem) {
  const requestId = nanoid();

  child.send({
    id: requestId,
    url: url,
    method: method,
    body: body,
    certPem: certPem,
    keyPem: keyPem
  });

  return new Promise((res, rej) => {
    const intervalTime = 300;
    let elapsedTime = 0;
    const intervalId = setInterval(() => {
      console.log("Waiting for request " + requestId);
      if (requestId in requestResponses) {
        clearInterval(intervalId);

        if (requestResponses[requestId].error) {
          rej(requestResponses[requestId].error);
        } else {
          res(requestResponses[requestId].response);
        }
        delete requestResponses[requestId];
      } else {
        elapsedTime += intervalTime;
      }
    }, intervalTime);
  });
}

exports.queryProvider = async function (url, method, body, certPem, prvPem) {
  console.log("Querying provider using proxy");

  try {
    const response = await makeRequest(url, method, body, certPem, prvPem);

    return response;
  } catch (err) {
    console.error(err);
    console.log("Failed to query provider with proxy");
    throw err;
  }
};

function getProxyFilePath() {
  switch (process.platform) {
    case "win32":
      return "./tools/akashlytics-provider-proxy.exe"
    case "darwin":
      return "./tools/akashlytics-provider-proxy"
    default:
      throw new Error("Unsupported platform: " + process.platform);
  }
}