---
title: 3、HTTP协议和最简单的http服务器
date: 2026-05-28
category: Linux网络编程
---
# HTTP协议和最简单的http服务器

## 1、http协议
上一篇文章我们自己制定了协议，简单来说`http`协议就是有人帮我们先制定好的现成的应用层协议。
通过http协议从服务器上拿下来对应的资源，比如视频图片各种文件资源`http`都可以搞定，所以也称之为超文本传输协议。
## 2、认识URL

### 2.1 HTTP URL
平时我们俗称的 "网址" 其实就是说的 `URL`，下面这张图介绍的就是`HTTP URL`结构解析图和访问流程
![unique_ptr](/images/linuxOS/WEB/2.png)
让我们来看一看`HTTP`的请求数据格式,一般包含以下四个部分
- a.首行: 方法 `URL` 版本
- b.`Header`: 包含请求的属性，是冒号分隔的键值对比如系统信息，正文数据长度等等  
- c.空行
- d.正文数据，当然了也是允许为空的
![unique_ptr](/images/linuxOS/WEB/6.png)

`HTTP`的响应数据格式
- a.首行: 版本号 状态码 状态码解释
- b.`Header`: 包含请求的属性，是冒号分隔的键值对比如系统信息，正文数据长度等等  
- c.空行
- d.正文数据，当然了也是允许为空的
![unique_ptr](/images/linuxOS/WEB/5.png)

### 2.2 HTTPS URL
![unique_ptr](/images/linuxOS/WEB/3.png)
### 2.3 urlencode和urldecode
我们可以看到图中有很多的特殊字符已经被`URL`当作特殊含义进行理解了，所以这些字符并不能够随意出现，也就是说假如我们的参数中带有这些特殊字符，那就一定要进行转义
转义规则如图所示：
![unique_ptr](/images/linuxOS/WEB/4.png)

这也就是`urlencode`和`urldecode`
### 2.4 HTTP 对比 HTTPS 
| 对比项       | HTTP                        | HTTPS                              |
| --------- | --------------------------- | ---------------------------------- |
| 全称        | HyperText Transfer Protocol | HyperText Transfer Protocol Secure |
| 安全性       | ❌ 不加密                       | ✅ TLS/SSL 加密                       |
| 默认端口      | 80                          | 443                                |
| 数据传输      | 明文                          | 密文                                 |
| 是否容易被窃听   | 容易                          | 很难                                 |
| 是否验证服务器身份 | 不验证                         | 验证证书                               |
| URL前缀     | `http://`                   | `https://`                         |
| 浏览器显示     | 不安全                         | 🔒 安全锁                             |
| 性能        | 略快                          | 握手稍慢                               |
| 适用场景      | 内网/测试                       | 现代网站标准                             |

## 3、http服务器
接下来我们来实现一个最简单的http服务器
### 3.1 httpServer.hpp服务器端实现
```c++
#pragma once

#include <iostream>
#include <string>
#include <cstring>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include "Protocol.hpp"

namespace http
{
    class HttpServer
    {
    private:
        int _port;
        int _listen_sockfd; // 监听文件描述符

    public:
        HttpServer(int port)
            : _port(port), _listen_sockfd(-1)
        {}

        void Init()
        {
            _listen_sockfd = socket(AF_INET, SOCK_STREAM, 0); // 指定的通信协议域 套接字类型 协议（一般就设置成0就好了，可以根据通信协议域和套接字类型选择）
            if (_listen_sockfd < 0)
            {
                perror("socket");
                exit(1);
            }

            int opt = 1;
            setsockopt(_listen_sockfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

            // 3. 配置本地网络地址信息
            sockaddr_in local{};
            local.sin_family = AF_INET;
            local.sin_port = htons(_port);
            local.sin_addr.s_addr = INADDR_ANY;

            // 4. 将套接字与网络地址（IP + 端口）进行绑定
            if (bind(_listen_sockfd, (sockaddr*)&local, sizeof(local)) < 0)
            {
                perror("bind");
                exit(2);
            }

            if (listen(_listen_sockfd, 5) < 0)
            {
                perror("listen");
                exit(3);
            }

            std::cout << "HttpServer start on port: " << _port << std::endl;
        }

        void Start()
        {
            while (true)
            {
                sockaddr_in peer{};
                socklen_t len = sizeof(peer);
                // 这里我来介绍一下，_listen_sockfd这个套接字的作用吗，它相当于是一个总机，在接受的客户端申请之后出现一个新的套接字这个是专门用来通信的
                int sockfd = accept(_listen_sockfd, (sockaddr*)&peer, &len);
                if (sockfd < 0)
                {
                    perror("accept");
                    continue;
                }

                Service(sockfd);
                close(sockfd);
            }
        }

        void Service(int sockfd)
        {
            char buffer[4096];
            ssize_t n = recv(sockfd, buffer, sizeof(buffer) - 1, 0);

            if (n > 0)
            {
                buffer[n] = '\0';

                std::cout << "===== HTTP Request =====" << std::endl;
                std::cout << buffer << std::endl;

                std::string body =
                    "<html>"
                    "<head><meta charset='utf-8'><title>HttpServer</title></head>"
                    "<body>"
                    "<h1>Hello HTTP Server</h1>"
                    "<p>这是一个用 C++ 实现的简单 HTTP 服务器</p>"
                    "</body>"
                    "</html>";

                std::string response = HttpResponse::BuildHtmlResponse(body);
                send(sockfd, response.c_str(), response.size(), 0);
            }
        }

        ~HttpServer()
        {
            if (_listen_sockfd >= 0)
            {
                close(_listen_sockfd);
            }
        }
    };
}
```

### 3.1 protocol.hppURL协议实现
```c++
#pragma once

#include <string>

namespace http
{
    class HttpResponse
    {
    public:
        static std::string BuildHtmlResponse(const std::string& body)
        {
            std::string response;

            // 首行部分 版本号 状态码 状态码解释
            response += "HTTP/1.1 200 OK\r\n";
            // 响应报头
            response += "Content-Type: text/html; charset=utf-8\r\n";
            response += "Content-Length: " + std::to_string(body.size()) + "\r\n";
            response += "Connection: close\r\n";
            // 空行
            response += "\r\n";
            // 正文部分
            response += body;

            return response;
        }
    };
}
```