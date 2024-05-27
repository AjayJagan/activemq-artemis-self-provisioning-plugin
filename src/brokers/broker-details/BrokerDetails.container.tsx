import { FC, useState, useEffect } from 'react';
import {
  GreenCheckCircleIcon,
  K8sResourceKind,
  RedExclamationCircleIcon,
  k8sGet,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { useParams, useLocation, useHistory } from 'react-router-dom';
import {
  Tabs,
  Tab,
  TabTitleText,
  Title,
  PageSection,
  PageSectionVariants,
  Spinner,
} from '@patternfly/react-core';
import { useTranslation } from '../../i18n';
import {
  ClientsContainer,
  ConfigurationContainer,
  AddressContainer,
  OverviewContainer,
} from './components';
import {
  AMQBrokerModel,
  JolokiaTestPanel,
  useJolokiaLogin,
  AuthContext,
  getApiServerBaseUrl,
  JolokiaBrokerDetails,
  JolokiaAddressDetails,
  JolokiaAcceptorDetails,
  JolokiaQueueDetails,
  K8sResourceCommon,
} from '../../utils';
import { BrokerDetailsBreadcrumb } from '../../shared-components/BrokerDetailsBreadcrumb';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OpenAPI as OpenAPIConfig } from '../../openapi/jolokia/requests/core/OpenAPI';

const BrokerDetailsPage: FC = () => {
  const { t } = useTranslation();
  const {
    ns: namespace,
    brokerName,
    podName,
  } = useParams<{
    ns?: string;
    brokerName?: string;
    podName?: string;
  }>();
  const [brokerDetails, setBrokerDetails] = useState<K8sResourceCommon>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [routes] = useK8sWatchResource<K8sResourceKind[]>({
    isList: true,
    groupVersionKind: {
      group: 'route.openshift.io',
      kind: 'Route',
      version: 'v1',
    },
    namespaced: true,
  });

  const location = useLocation();
  const history = useHistory();
  const searchParams = new URLSearchParams(location.search);
  const activeTabKey = searchParams.get('tab') || 'overview';

  const k8sGetBroker = () => {
    setLoading(true);
    k8sGet({ model: AMQBrokerModel, name: brokerName, ns: namespace })
      .then((broker: K8sResourceKind) => {
        setBrokerDetails(broker as K8sResourceCommon);
      })
      .catch((e) => {
        console.error(e);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    k8sGetBroker();
  }, []);

  const handleTabSelect = (_event: any, eventKey: string | number) => {
    searchParams.set('tab', eventKey.toString());
    history.push({ search: searchParams.toString() });
  };

  const podOrdinal = parseInt(podName.replace(brokerName + '-ss-', ''));

  const { token, isSucces, isLoading, isError, source } = useJolokiaLogin(
    brokerDetails,
    routes,
    podOrdinal,
  );

  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);
  const [notify, setNotify] = useState(false);
  if (prevIsLoading !== isLoading) {
    if (!isLoading && source === 'api') {
      setNotify(true);
    }
    setPrevIsLoading(isLoading);
  }
  if (notify) {
    if (isSucces) {
      // TODO maybe use the OpenShift console notification system to let the
      // user know that the login was a success?
      alert(
        'login successful ' + brokerDetails?.metadata?.name + ' token ' + token,
      );
    } else {
      alert('login failed');
    }
    setNotify(false);
  }

  return (
    <AuthContext.Provider value={token}>
      <PageSection
        variant={PageSectionVariants.light}
        padding={{ default: 'noPadding' }}
        className="pf-c-page__main-tabs"
      >
        <div className="pf-u-mt-md pf-u-ml-md pf-u-mb-md">
          <BrokerDetailsBreadcrumb
            name={brokerName}
            namespace={namespace}
            podName={podName}
          />
          <Title headingLevel="h2">
            {t('broker')} {brokerName} {t('/')} {podName}
          </Title>
        </div>
        <Tabs activeKey={activeTabKey} onSelect={handleTabSelect}>
          <Tab
            eventKey={'overview'}
            title={<TabTitleText>{t('overview')}</TabTitleText>}
          >
            <OverviewContainer
              name={brokerName}
              namespace={namespace}
              size={brokerDetails?.spec?.deploymentPlan?.size}
              loading={loading}
            />
          </Tab>
          <Tab
            eventKey={'configuration'}
            title={<TabTitleText>{t('configuration')}</TabTitleText>}
          >
            <ConfigurationContainer
              configurationSettings={brokerDetails}
              loading={loading}
            />
          </Tab>
          <Tab
            eventKey={'clients'}
            title={<TabTitleText>{t('clients')}</TabTitleText>}
          >
            <ClientsContainer />
          </Tab>
          <Tab
            eventKey={'addresses'}
            title={<TabTitleText>{t('addresses')}</TabTitleText>}
          >
            <AddressContainer />
          </Tab>
          <Tab
            eventKey={'jolokiaTestPanel'}
            title={
              <TabTitleText>
                {t('check-jolokia ')}

                {isLoading && (
                  <Spinner size="sm" aria-label="connecting to jolokia" />
                )}
                {isSucces && <GreenCheckCircleIcon title="Jolokia connected" />}
                {isError && (
                  <RedExclamationCircleIcon title="Jolokia connection failed" />
                )}
              </TabTitleText>
            }
          >
            <JolokiaTestPanel />
            <br />
          </Tab>
          <Tab
            eventKey={'jolokia-details'}
            title={
              <TabTitleText>
                {t('-jolokia-details')}

                {isLoading && (
                  <Spinner size="sm" aria-label="connecting to jolokia" />
                )}
                {isSucces && <GreenCheckCircleIcon title="Jolokia connected" />}
                {isError && (
                  <RedExclamationCircleIcon title="Jolokia connection failed" />
                )}
              </TabTitleText>
            }
          >
            <Tabs defaultActiveKey={0}>
              <Tab
                eventKey={0}
                title={<TabTitleText>{t('broker')}</TabTitleText>}
              >
                <JolokiaBrokerDetails />
              </Tab>
              <Tab
                eventKey={1}
                title={<TabTitleText>{t('addresses')}</TabTitleText>}
              >
                <JolokiaAddressDetails />
              </Tab>
              <Tab
                eventKey={2}
                title={<TabTitleText>{t('acceptors')}</TabTitleText>}
              >
                <JolokiaAcceptorDetails />
              </Tab>
              <Tab
                eventKey={3}
                title={<TabTitleText>{t('queues')}</TabTitleText>}
              >
                <JolokiaQueueDetails />
              </Tab>
            </Tabs>
          </Tab>
        </Tabs>
      </PageSection>
    </AuthContext.Provider>
  );
};

const App: FC = () => {
  OpenAPIConfig.BASE = getApiServerBaseUrl();
  const querClient = new QueryClient();
  return (
    <QueryClientProvider client={querClient}>
      <BrokerDetailsPage />
    </QueryClientProvider>
  );
};

export default App;
