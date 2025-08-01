import 'swagger-ui-react/swagger-ui.css';

import type { NextPage } from 'next';
import dynamic from 'next/dynamic';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

const customStyles = `
  body {
    background-color: #ffffff;
  }
`;

const Home: NextPage = () => {
  // Serve Swagger UI with our OpenAPI schema
  return (
    <>
      <style>{customStyles}</style>
      <SwaggerUI url="/api/openapi.json" />
    </>
  );
};

export default Home;
