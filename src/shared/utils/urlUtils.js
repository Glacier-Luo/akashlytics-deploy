export class UrlService {
  static dashboard = () => "/";
  static deploymentList = (shouldRefresh) => `/deployments/${shouldRefresh ? "?refetch=true" : ""}`;
  static deploymentDetails = (dseq) => `/deployment/${dseq}`;
  static settings = () => "/settings";

  static createDeployment = () => "/createDeployment";
  static createDeploymentStepTemplate = () => "/createDeployment/chooseTemplate";
  static createDeploymentStepManifest = () => "/createDeployment/editManifest";
  static createDeploymentStepBids = () => "/createDeployment/acceptBids";
}
