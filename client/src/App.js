import './App.css';
import { BrowserRouter, Link, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const SITE_URL = 'http://localhost:3000';
const REGION = 'Please set the using region';

const S3_BUCKET_NAME = 'Please see the value of CDK Output';
const IDENTITY_POOL_ID = 'Please see the value of CDK Output';
const COGNITO_DOMAIN_NAME = 'Please see the value of CDK Output';
const COGNITO_USER_POOL_ID = 'Please see the value of CDK Output';
const COGNITO_CLIENT_ID = 'Please see the value of CDK Output';

const COGNITO_LOGIN_CALLBACK_URI = `${SITE_URL}/auth`;
const COGNITO_LOGIN_URL = `https://${COGNITO_DOMAIN_NAME}.auth.${REGION}.amazoncognito.com/login?client_id=${COGNITO_CLIENT_ID}&response_type=code&scope=email+openid+profile&redirect_uri=${COGNITO_LOGIN_CALLBACK_URI}`;
const COGNITO_TOKEN_ENDPOINT = `https://${COGNITO_DOMAIN_NAME}.auth.${REGION}.amazoncognito.com/oauth2/token`;

const regexpCallbackUrl = new RegExp(`^${COGNITO_LOGIN_CALLBACK_URI}`);

class AuthUtil {
  static isAuthrized = () => {

    if (regexpCallbackUrl.test(window.location.href)){
      return true;
    }
    const cookies = document.cookie.split(';');
    const cookieObj = {};
    cookies.forEach((cookie) => {
      const cookieParam = cookie.split('=');
      const key = cookieParam[0].trim();
      const value = cookieParam[1].trim();
      if (key === 'id_token' || key === 'expires_in'){
        cookieObj[key] = value;
      }
    });

    if (Object.keys(cookieObj).length === 0){
      console.warn('No cookie');
      return false;
    }

    const jwtPayload = this.getPayloadFromJwt(cookieObj['id_token']);
    if (this.isExpired(jwtPayload)){
      console.warn('Expired Token');
      return false;
    }

    return true;
  }

  static getPayloadFromJwt = (token) => {
    const payload = token.split('.')[1];
    return JSON.parse(decodeURIComponent(escape(window.atob(payload.replace(/-/g, '+').replace(/_/g, '/')))));
  }

  static isExpired = (jwtPayload) => {
    const currentTime = (new Date()).getTime();
    return (jwtPayload.exp * 1000 < currentTime);
  }

  static authorize = () => {
    try {
      const authCodeParam = window.location.href.split("?")[1];
      if (!authCodeParam || authCodeParam.indexOf('code=') < 0){
        console.warn('Not auth.');
        window.location.href = COGNITO_LOGIN_URL;
        return;
      }

      const authCode = authCodeParam.split('=')[1];
      console.log(`authCode=${authCode}`);
      var prm = new URLSearchParams();
      prm.append('grant_type', 'authorization_code');
      prm.append('code', authCode);
      prm.append('client_id', COGNITO_CLIENT_ID);
      prm.append('redirect_uri', COGNITO_LOGIN_CALLBACK_URI);
      const req = new Request(COGNITO_TOKEN_ENDPOINT, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'post',
        body: prm
      });
      fetch(req).then((res)=> {
        if (res.ok) {
          console.log(res);
          res.json().then((json)=>{
            console.log(json);
            console.log(`id_token=${json.id_token}`);
            console.log(`refresh_token=${json.refresh_token}`);
            console.log(`expires_in=${json.expires_in}`);
            console.log(`token_type=${json.token_type}`);

            document.cookie = `id_token=${json.id_token}; max-age=${json.expires_in}; path=/; SameSite=strict;`;
            document.cookie = `refresh_token=${json.refresh_token}; max-age=${json.expires_in}; path=/; SameSite=strict;`;

            window.location.href = `${SITE_URL}/upload`
          })
        }
        else{
          console.log(res);
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  static getToken = () => {
    const cookies = document.cookie.split(';');
    let idToken = '';
    cookies.forEach((cookie) => {
      const cookieParam = cookie.split('=');
      const key = cookieParam[0].trim();
      const value = cookieParam[1].trim();
      if (key === 'id_token'){
        idToken = value;
        return;
      }
    });
    return idToken;
  }
}

if (!AuthUtil.isAuthrized()){
  window.location.href = COGNITO_LOGIN_URL;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/auth" element={<Auth />} />
        <Route path="/upload" element={<Upload />} />
      </Routes>
    </BrowserRouter>
  );
}

function Home() {
  return (
  <>
    <h2>Home</h2>
    <Link to="upload">Go to upload test</Link>
  </>);
}

function Auth() {
  AuthUtil.authorize();
  return <p>authorizing...</p>;
}

function Upload() {
  const [prefix, setPrefix] = useState('');
  const [file, setFile] = useState();
  const [uploadStatus, setUploadStatus] = useState({className:'', message:''});

  const handleOnSubmit = async (e) => {
    e.preventDefault();
    const idToken = AuthUtil.getToken();

    const s3 = new S3Client({
      region: REGION,
      credentials: fromCognitoIdentityPool({
        clientConfig: { region: REGION },
        identityPoolId: IDENTITY_POOL_ID,
        logins: {
          [`cognito-idp.${REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`]: idToken
        },
        // for Test
        roleSessionName: 'test-session'
      })
    });

    const req = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: `${prefix}/${file.name}`,
      Body: file
    });

    s3.send(req)
      .then((res) => {
        console.info(res);
        setUploadStatus({className: 'success', message: 'Complete!!'});
      })
      .catch((error) => {
        console.error(error);
        setUploadStatus({className: 'failure', message: `Error!! (${error.message})`});
      });
  }

  return (
    <>
      <h2>S3 Upload Test</h2>
      <form action="" onSubmit={(e) => handleOnSubmit(e)}>
        <label>S3 prefix: 
          <input type="text" name="prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="S3 prefix"/>
        </label>
        <label>Upload file:
          <input type="file" name="file" multiple onChange={(e) => setFile(e.target.files[0])}/>
        </label>
        <input type="submit" value="upload" />
      </form>
      <p className={uploadStatus.className}>{uploadStatus.message}</p>
    </>
  );
}

export default App;
