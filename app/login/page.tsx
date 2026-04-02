"use client"; // For components that need React hooks and browser APIs, SSR (server side rendering) has to be disabled. Read more here: https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering

import { useRouter } from "next/navigation"; // use NextJS router for navigation
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button, Form, Input } from "antd";
import Image from "next/image";


interface FormFieldProps {
  label: string;
  value: string;
}

const Login: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const [form] = Form.useForm();
  // useLocalStorage hook example use
  // The hook returns an object with the value and two functions
  // Simply choose what you need from the hook:
  const {
    value: token, // is commented out because we do not need the token value
    set: setToken, // we need this method to set the value of the token to the one we receive from the POST request to the backend server API
    // clear: clearToken, // is commented out because we do not need to clear the token when logging in
  } = useLocalStorage<string>("token", ""); // note that the key we are selecting is "token" and the default value we are setting is an empty string
  // if you want to pick a different token, i.e "usertoken", the line above would look as follows: } = useLocalStorage<string>("usertoken", "");

  const { set: setUserId } = useLocalStorage<string>("id", ""); // we need this method to set the value of the userId to the one we receive from the POST request to the backend server API

  const handleLogin = async (values: FormFieldProps) => {
    try {
      // Call the API service and let it handle JSON serialization and error handling
      const response = await apiService.post<User>("/login", values);

      // Use the useLocalStorage hook that returned a setter function (setToken in line 41) to store the token if available
      if (response.token) {
        setToken(response.token);

        if (response.id) {
          setUserId(response.id);
        }

        router.push("/users");
      }


    } catch (error) {
      if (error instanceof Error) {
        alert(`Something went wrong during the login:\n${error.message}`);
      } else {
        console.error("An unknown error occurred during login.");
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <Image
            className="auth-logo"
            src="/quoridor.png"
            alt="Quoridor Chaos Arena"
            width={400}
            height={267}
            priority
          />
        </div>

        <Form
          form={form}
          name="login"
          size="large"
          variant="outlined"
          onFinish={handleLogin}
          layout="vertical"
          className="auth-form"
          style={{ width: "100%" }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please enter your username." }]}
          >
            <Input placeholder="Enter your username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please enter your password." }]}
          >
            <Input.Password placeholder="Enter your password" />
          </Form.Item>

          <Form.Item style={{ marginTop: "20px" }}>
            <Button type="primary" htmlType="submit" className="auth-btn-primary">
              Login
            </Button>
          </Form.Item>

          <Form.Item>
            <Button type="default" onClick={() => router.push("/register")} className="auth-btn-secondary">
              Create an Account
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Login;
