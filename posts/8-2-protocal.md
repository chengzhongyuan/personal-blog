---
title: 网络版计算器协议设计
date: 2026-05-27
category: Linux网络编程
---
# 网络版计算器协议设计

## 1、什么是协议
利用生活中的“约定”类比协议：双方提前说好某种信号代表某种含义。网络通信中的协议也是约定，只不过它更严格，通常要约定：

- 发送哪些字段。
- 字段按什么顺序出现。
- 字段之间如何分隔。
- 每个字段是什么类型。
- 一条完整报文从哪里开始、到哪里结束。
- 成功和失败如何表达。
- 错误码分别代表什么。

在本次实现的网络版计算器中，应用层协议至少要约定两类内容：

1. 业务内容格式：例如请求中包含 `x`、`op`、`y`，响应中包含 `exitcode`、`result`。
2. 报文边界格式：例如用长度字段告诉接收方正文有多长。

协议不是某一个接口，也不是某一种语言特性。协议是通信双方共同遵守的数据格式和处理规则。
## 2、为什么需要协议定制

咱们在上一篇文章之中提到的服务器只是可以简单的读入数据，处理数据再返回。只需要直接收收字符串就可以完成演示，但是在实际应用的过程当中却并不是这样的往往是结构化的数据，比如用户发了一条消息但是并不是仅仅只有一条字符串数据。
- 头像或头像 ID。
- 昵称。
- 发送时间。
- 消息正文。
- 群号或会话 ID。
- 这些数据肯定不会在网络里面进行零散的发送，要把他们编程一个整体也就是一个报文。

对于网络版计算器，结构化数据更简单，下面就是打包成报文的抽象图。
![unique_ptr](/images/linuxOS/WEB/1.png)


## 3、参照整体的逻辑图我们去具体的实现
### tcpClient.hpp
我们需要关注的是这一部分的实现`void StartCal();`
```c++
#pragma once

#include <iostream>
#include <string>
#include <cstdint>
#include <thread> // 引入多线程支持

namespace client
{
    class TcpClient
    {
    private:
        std::string _server_ip;
        uint16_t _server_port;
        int _sockfd;
        bool _is_running; // 控制读写线程退出的开关

    public:
        TcpClient(const std::string& server_ip, uint16_t server_port);
        ~TcpClient();

        void InitAndConnect();
        
        // 启动全双工聊天（内部会派生接收线程）
        void StartChat();

        // 启动自定自定义协议进行计算
        void StartCal();


    private:
        // 独立运行在后台的子线程函数：专门负责接收服务器广播
        // void ReceiveLoop();
    };
}
```
### tcpClient.cc
```c++
#include "tcpClient.hpp"
#include "protocol.hpp"
#include <sstream>

#include <iostream>
#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <cstring>

using namespace client;

TcpClient::TcpClient(const std::string& server_ip, uint16_t server_port)
    : _server_ip(server_ip), _server_port(server_port), _sockfd(-1), _is_running(false)
{
}

TcpClient::~TcpClient()
{
    _is_running = false;
    if (_sockfd >= 0)
    {
        close(_sockfd);
    }
}

void TcpClient::InitAndConnect()
{
    _sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (_sockfd < 0)
    {
        perror("socket creation failed");
        exit(1);
    }

    struct sockaddr_in server_addr{};
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(_server_port);
    
    if (inet_pton(AF_INET, _server_ip.c_str(), &server_addr.sin_addr) <= 0)
    {
        std::cerr << "无效的 IP 地址格式！" << std::endl;
        exit(1);
    }

    std::cout << "正在连接到服务器 " << _server_ip << ":" << _server_port << " ..." << std::endl;
    if (connect(_sockfd, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0)
    {
        perror("连接服务器失败 (connect failed)");
        exit(1);
    }

    std::cout << "🎉 成功连接到服务器！可以开始聊天了。\n" << std::endl;
}


// 错误码转字符串
std::string ErrorToString(int code)
{
    switch (code)
    {
    case OK:
        return "计算成功";
    case DIV_ZERO:
        return "除零错误";
    case MOD_ZERO:
        return "模零错误";
    case OP_ERROR:
        return "非法操作符";
    case FORMAT_ERROR:
        return "请求格式错误";
    default:
        return "未知错误";
    }
}

// 计算器客户端主逻辑
void TcpClient::StartCal()
{
    _is_running = true;

    std::string inbuffer;

    while (_is_running)
    {
        int x;
        int y;
        char op;

        std::cout << "请输入计算表达式，例如 10 + 20.退出输入 quit" << std::endl;
        std::cout << "Calculate# ";

        std::string line;
        std::getline(std::cin, line);

        if (line == "quit" || line == "exit")
        {
            std::cout << "客户端退出。" << std::endl;
            break;
        }

        if (line.empty())
        {
            continue;
        }

        // 从用户输入中解析 x op y
        std::stringstream ss(line);
        ss >> x >> op >> y;

        if (!ss)
        {
            std::cout << "输入格式错误,正确示例:10 + 20" << std::endl;
            continue;
        }

        // 1. 构造 Request 对象
        Request req(x, y, op);

        // 2. Request 序列化
        std::string req_body;
        req.Serialize(&req_body);

        // 3. Encode 添加报头
        std::string req_package = Encode(req_body);

        // 4. send 发送完整报文
        ssize_t send_bytes = send(_sockfd, req_package.c_str(), req_package.size(), 0);
        if (send_bytes < 0)
        {
            perror("send failed");
            break;
        }

        // 5. recv 接收服务端响应
        char buffer[1024];
        ssize_t recv_bytes = recv(_sockfd, buffer, sizeof(buffer), 0);

        if (recv_bytes > 0)
        {
            // 6. 追加到接收缓冲区
            inbuffer.append(buffer, recv_bytes);

            // 7. Decode 解析完整响应报文
            std::string resp_body;
            bool ok = Decode(inbuffer, &resp_body);

            if (!ok)
            {
                std::cout << "响应报文还不完整，等待下一次接收。" << std::endl;
                continue;
            }

            // 8. 反序列化 Response
            Response resp;
            if (!resp.Deserialize(resp_body))
            {
                std::cout << "响应反序列化失败。" << std::endl;
                continue;
            }

            // 9. 根据 exitcode 展示结果
            if (resp.exitcode == OK)
            {
                std::cout << "计算结果: " << resp.result << std::endl;
            }
            else
            {
                std::cout << "计算失败: " << ErrorToString(resp.exitcode) << std::endl;
            }
        }
        else if (recv_bytes == 0)
        {
            std::cout << "服务器关闭连接。" << std::endl;
            break;
        }
        else
        {
            perror("recv failed");
            break;
        }
    }

    _is_running = false;

    if (_sockfd >= 0)
    {
        close(_sockfd);
        _sockfd = -1;
    }
}
// main 函数保持完全不变即可
int main()
{
    std::string server_ip = "127.0.0.1"; 
    uint16_t server_port = 8888;

    client::TcpClient cli(server_ip, server_port);
    cli.InitAndConnect();
    cli.StartCal();

    return 0;
}

```
### tcpServer.hpp
```c++
#pragma once

#include <iostream>
#include <string>
#include <functional>
#include <stdint.h>

// 将服务端进行改造实现多人聊天室的功能
#include <unordered_map>
#include <mutex>

namespace server
{
    class TcpServer; // 前置声明，因为回调定义里需要用到该指针
    // 升级后的回调函数签名：
    // 参数1：服务器对象指针 (this)
    // 参数2：发送消息的客户端专属文件描述符
    // 参数3：发送者的身份字符串 (例如 "127.0.0.1:47252")
    // 参数4：收到的消息体
    using ServiceCallback = std::function<void(TcpServer*, int, const std::string&, const std::string&)>;

    class TcpServer{
        private:
            uint16_t _port;             // 服务器绑定的端口号
            ServiceCallback _callback;  // 要使用的回调函数
            // 这里是与udp不同的地方
            int _listen_sockfd;         // 监听套接字 (TCP 特有：专门负责“迎宾”)
            bool _is_running;           // 控制服务器运行状态的开关

            // key: 客户端的描述符, value: 客户端的描述符（或者包含IP、Port的结构体）
            std::unordered_map<int, std::string> _online_clients; 
            std::mutex _mtx; // 保护通讯录的锁
        public:
            // 构造函数
            TcpServer(uint16_t _port,ServiceCallback _callback);
            ~TcpServer();

            // 1. 初始化服务器
            // 核心职责：完成 socket() -> bind() -> listen() 三步曲
            void InitServer();
            void Start();

            void Broadcast(int sender_fd, const std::string& sender_info, const std::string& message);
            void calInterface(int sender_fd, const std::string& sender_info, const std::string& message);
            

        private:
            // 3. 为单个连接的客户端提供服务 (内部辅助函数)
            // TCP 是面向连接的，拉到客之后，通常交由这个函数(或者新线程)去专心服务他
            void Service(int client_sockfd, const std::string& client_ip, uint16_t client_port);
    };
}
```

### tcpServer.cc
这里我们需要关注的是回调函数c中对数据解码，反序列化，计算，序列化，再编码传回的一个过程
```c++
#include "tcpServer.hpp"
#include "log.hpp"
#include "protocol.hpp"
#include <sys/types.h>          
#include <sys/socket.h>
#include <string.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <thread>

using namespace std;
// 构造函数，初始时传入端口号和业务逻辑
server::TcpServer::TcpServer(uint16_t port, ServiceCallback cb)
    : _port(port), 
    _callback(cb),
    _listen_sockfd(-1),
    _is_running(false)
{
    // 完成目前所有初始工作
}

// 1. 初始化服务器
// 核心职责：完成 socket() -> bind() -> listen() 三步曲
void server::TcpServer::InitServer()
{
    // 1、创建套接字对应空间
    _listen_sockfd = socket(AF_INET,SOCK_STREAM,0);
    if (_listen_sockfd < 0)
    {
        // 使用 FATAL 级别，像 printf 一样传入 %d 和 %s
        LogMessage(FATAL, "创建套接字失败! 错误码: %d, 描述: %s", errno, strerror(errno));
        // std::cout << "socket error" << errno << ":" << strerror(errno) << std::endl;
        // perror("socket");
        exit(1);
    }

    // 2、进行绑定
    struct sockaddr_in addr{}; // 这就是一个初始化的操作
    addr.sin_family = AF_INET; // 协议域
    addr.sin_port = htons(_port); // 端口号要转换成大端字节序的方式进行网络端的传输
    addr.sin_addr.s_addr = INADDR_ANY;// 任意IP地址

    if (bind(_listen_sockfd,(struct sockaddr *)&addr, sizeof(addr)) < 0 )
    {
        perror("bind");
        exit(1);
    }

    // 3、监听 (Listen) —— 这是 TCP 特有的
    // 5 表示全连接队列的长度，通常设置 5~128 都可以
    if (listen(_listen_sockfd, 5) < 0) 
    {
        perror("listen");
        exit(1);
    }

    LogMessage(NORMAL,"TCP 服务器启动成功，正在监听端口 %d", _port);
    // std::cout << "TCP Server started on port " << _port << std::endl;
    
}

// 2. 启动服务器
// 核心职责：进入死循环，调用 accept() 不断接收新客户的连接
void server::TcpServer::Start()
{
    _is_running = true;
    while (_is_running)
    {
        struct sockaddr_in clientaddr{};
        socklen_t len = sizeof(clientaddr);

        // 1、从等待队列之中拉去一个用户
        // RETURN VALUE
        // On success, these system calls return a nonnegative integer that is a descriptor for the accepted socket.  
        // On error, -1 is returned, and errno is set appropriately.
        int client_sockfd = accept(_listen_sockfd,(struct sockaddr*)&clientaddr,&len);
        if (client_sockfd < 0)
        {
            perror("accept error");
            continue; // 拉客失败没关系，继续拉下一个，不要让整个服务器崩溃
        }

        // 2、提取客户端的IP地址和端口号
        char ip_buf[32];
        // 把底层网络二进制转换成可读的字符串提取
        inet_ntop(AF_INET, &clientaddr.sin_addr, ip_buf, sizeof(ip_buf));
        // 转换IP和端口号
        std::string client_ip = ip_buf;
        uint16_t client_port = ntohs(clientaddr.sin_port);// 网络字节序转换成可读


        LogMessage(NORMAL, "新客户接入! IP: %s, 端口: %d, 分配FD: %d", client_ip.c_str(), client_port, client_sockfd);
        // std::cout << "\n[新连接建立] Client IP: " << client_ip 
        //           << ", Port: " << client_port 
        //           << ", 分配的单间 fd: " << client_sockfd << std::endl;
        
        // 3、链接建立完成开始提供服务端服务,这是一个只能一对一的版本，现在引入多线程概念去实现
        // Service(client_sockfd, client_ip, client_port);

        // 修改成多人在线聊天室
        // 登记：将新连接加入在线映射表
        {
            std::lock_guard<std::mutex> lock(_mtx); // 自动加锁/解锁
            _online_clients[client_sockfd] = client_ip + ":" + std::to_string(client_port);
        }

        // =========================================================
        // （开辟新线程）
        // 参数1：要执行的函数指针 (&TcpServer::Service)
        // 参数2：类成员函数需要传入的 this 指针
        // 参数3-5：传给 Service 函数的具体参数
        // =========================================================
        // 这里的fd只能传值，因为这是循环接收的假如我们传引用这个数值会一直改变
        std::thread t(&TcpServer::Service, this, client_sockfd, client_ip, client_port);
        // 执行完任务之后去析构掉
        t.detach();
    }
    
}

void server::TcpServer::Service(int client_sockfd, const std::string& client_ip, uint16_t client_port)
{
    char buffer[1024];
    std::string client_info = client_ip + ":" + std::to_string(client_port);
    // 单间的死循环：只要客人不走，我们就一直为他服务
    while (true)
    {
        // 1：接收数据 (TCP 通常用 recv 或 read)
        // 注意这里用的 fd 是客人专属的 client_sockfd，绝对不能用 _listen_sockfd！
        ssize_t n = recv(client_sockfd, buffer, sizeof(buffer) - 1, 0);

        if (n > 0)
        {
            // 正常收到消息
            buffer[n] = '\0';
            std::cout << "[" << client_ip << ":" << client_port << "] 说: " << buffer << std::endl;

            // 核心传递：将处理权限转交给顶层的回调逻辑函数
            _callback(this, client_sockfd, client_info, buffer);
        }
        else if (n == 0)
        {
            // ? 极其重要：在 TCP 中，recv 返回 0 代表对端（客户端）主动断开了连接！
            std::cout << "[" << client_ip << ":" << client_port << "] 正常退出，断开连接。" << std::endl;
            break; // 客人走了，结束这个死循环
        }
        else
        {
            // n < 0，发生网络错误（比如网线拔了）
            std::cout << "[" << client_ip << ":" << client_port << "] 发生异常，断开连接。" << std::endl;
            perror("recv error");
            break; // 同样必须退出死循环
        }
    }

    // 退出服务逻辑时，必须同时在映射表里擦除记录并回收文件描述符
    {
        std::lock_guard<std::mutex> lock(_mtx);
        _online_clients.erase(client_sockfd);
    }

    // ??? 致命重点：关门送客！
    // 只要退出了上面的循环，说明服务结束，必须立刻把单间钥匙还给操作系统！
    // 如果不写这一句，服务器运行一段时间后，所有的系统 FD 资源会被耗尽，服务器直接崩溃！
    close(client_sockfd);
}

server::TcpServer::~TcpServer()
{
}

// ===================================================================
// 业务逻辑层实现 (解耦展示)
// ===================================================================

// 回调函数A: 原路返回业务 (Echo)
void echoService(server::TcpServer* svr, int fd, const std::string& info, const std::string& msg)
{
    std::string response = "[Echo 应答]: " + msg;
    send(fd, response.c_str(), response.size(), 0);
}

// 回调函数B: 多人聊天室消息广播插件
void chatRoomService(server::TcpServer* svr, int fd, const std::string& info, const std::string& msg)
{
    // 调用由服务端底层公开的 Broadcast 方法推送
    svr->Broadcast(fd, info, msg);
}
// 实现底层的广播分发机制
void server::TcpServer::Broadcast(int sender_fd, const std::string& sender_info, const std::string& message)
{
    // 组装群聊广播报文格式
    std::string broadcast_msg = "[" + sender_info + "] 对大家说: " + message;

    std::lock_guard<std::mutex> lock(_mtx);
    for (auto& client : _online_clients)
    {
        // 将消息分发给除了发送端以外的所有在线套接字
        if (client.first != sender_fd)
        {
            send(client.first, broadcast_msg.c_str(), broadcast_msg.size(), 0);
        }
    }
}

// 回调函数C: 计算之间协议通信实现
void calService(server::TcpServer* svr, int fd, const std::string& info, const std::string& msg)
{
    svr->calInterface(fd, info, msg);
}

// 实现底层的 解码 反序列化 计算 序列化编码
void server::TcpServer::calInterface(int sender_fd, const std::string& sender_info, const std::string& message)
{
    string inbuffer = message;
    // 这个时候应该对数据进行解码,body对返回的数据进行接收
    string body;
    if (!Decode(inbuffer, &body))
    {
        return;
    }
    // 然后进行反序列化
    Request req;
    Response resp;
    if (!req.Deserialize(body))
    {
        resp.exitcode = FORMAT_ERROR;
        resp.result = 0;
    } 
    else
    {
        switch (req.op)
        {
        case '+':
            resp.result = req.x + req.y;
            resp.exitcode = OK;
            break;
        case '-':
            resp.result = req.x - req.y;
            resp.exitcode = OK;
            break;
        case '*':
            resp.result = req.x * req.y;
            resp.exitcode = OK;
            break;
        case '/':
            if (req.y == 0)
                resp.exitcode = DIV_ZERO;
            else
            {
                resp.result = req.x / req.y;
                resp.exitcode = OK;
            }
            break;
        case '%':
            if (req.y == 0)
                resp.exitcode = MOD_ZERO;
            else
            {
                resp.result = req.x % req.y;
                resp.exitcode = OK;
            }
            break;
        default:
            resp.exitcode = OP_ERROR;
            break;
        }
    }
    // 这个时候要发送回去的数据已经计算完成要对数据进行序列化
    std::string resp_body;
    resp.Serialize(&resp_body);
    // 继续进行编码
    std::string resp_package = Encode(resp_body);
    send(sender_fd, resp_package.c_str(), resp_package.size(), 0);
}





int main()
{
    // 假设你目前先在本地进行自测，填 127.0.0.1
    // 如果要跨网测试，换成你服务器的公网 IP 即可


    server::TcpServer tcpserver(8888,calService);
    tcpserver.InitServer();
    tcpserver.Start();

    return 0;
}

```

### protocol.hpp
```c++
// 接下来就是我们实现的一个最重要的部分
#pragma once

/* 头文件区域 */
#include <iostream>
#include <string>
#include <cstring>

using namespace std;

/* 分隔符 */
#define SEP " "
#define SEP_LEN strlen(SEP)
/* 报头和正文之间的分隔符号 */
#define HEADER_SEP "\r\n"
#define HEADER_SEP_LEN strlen(HEADER_SEP)
/* 每条业务正文结束符 */
#define LAST_SEP "\n"
#define LAST_SEP_LEN strlen(LAST_SEP)

/* 错误码定义 */
enum
{
    OK = 0,          // 计算成功
    DIV_ZERO = 1,   // 除零错误
    MOD_ZERO = 2,   // 模零错误
    OP_ERROR = 3,   // 非法操作符
    FORMAT_ERROR = 4 // 反序列化失败
};

/* 我要先创建客户端给服务端发送请求的一个类Request */
class Request{
public:
	int x;
	int y;
	char op;
public:
	// 默认构造函数
	Request() :x(0), y(0), op(0)
	{
	}
	// 传参构造函数
	Request(int _x,int _y, char _op) :x(_x), y(_y), op(_op)
    {
    }

	/* 
	Serialize 把结构化对象转成字符串（序列化）所以我们这里需要的是一个输出型参数 
	所以我们最终需要的效果就是这样的
	"x + y\n"
	*/
	bool Serialize(string* out)
	{
		/* 数字转换成字符串 */
		string x_string = to_string(x);
		string y_string = to_string(y);

		*out = x_string + SEP + op + SEP + y_string + LAST_SEP;
		return true;
	}

	/* 
	Deserialize 把字符串解析回结构化对象，这里要解析的就是服务端发回的数据了
	*/
	bool Deserialize(const string& in )
	{
		// 找到第一个空格
		size_t left = in.find(SEP);
        if (left == string::npos) return false;
		// 找到第二个空格，这个意思就是从第一个空格位置后面开始进行寻找
        size_t right = in.find(SEP, left + SEP_LEN);
        if (right == std::string::npos) return false;

		// 这个函数是左闭右开
		// string str = "Hello";
		// string sub = str.substr(1, 3);  从下标 1 开始，取 3 个字符
        std::string xstr = in.substr(0, left);
        std::string opstr = in.substr(left + SEP_LEN, right - left - SEP_LEN);
        std::string ystr = in.substr(right + SEP_LEN);

		// 去掉最后的"\n"
        if (!ystr.empty() && ystr.back() == '\n') {
            ystr.pop_back();
        }

        if (opstr.size() != 1) return false;

        x = std::stoi(xstr);
        op = opstr[0];
        y = std::stoi(ystr);

        return true;
	}
}; 

/* 服务端给客户端返回的类Response */
class Response
{
public:
    int exitcode; // 状态码
    int result;   // 结果

public:
    Response()
        : exitcode(OK)
        , result(0)
    {}

    // ========================================================
    // 序列化 Response
    //
    // 例如：
    // 0 30\n
    // ========================================================

    bool Serialize(std::string* out)
    {
		string exitcode_string = to_string(exitcode);
		string result_string = to_string(result);
        *out = exitcode_string + SEP + result_string + LAST_SEP;
        return true;
    }

    // ========================================================
    // 反序列化 Response
    // ========================================================

    bool Deserialize(const std::string& in)
    {
        // 找空格
        size_t pos = in.find(SEP);

        if (pos == std::string::npos)
        {
            return false;
        }

        // 提取 exitcode
        std::string codestr = in.substr(0, pos);

        // 提取 result
        std::string resultstr =
            in.substr(pos + SEP_LEN);

        // 去掉 '\n'
        if (!resultstr.empty() &&
            resultstr.back() == '\n')
        {
            resultstr.pop_back();
        }

        exitcode = std::stoi(codestr);

        result = std::stoi(resultstr);

        return true;
    }
};

/* 这个时候我需要给正文添加报头让它可以进行有限制的读取，那么这里传进来的body表明的就是序列化之后的要进行发送的数据 */
string Encode(const string& body)
{
	// 计算正文的长度，我这里需要的还是字符串
	string package = to_string(body.size());
	
	return package + HEADER_SEP + body;
}



/* 
	Decode作用：从 inbuffer 中解析出一条完整报文
	输入：inbuffer
	输出：body
*/

bool Decode(std::string& inbuffer,std::string* body)
{
	/* 找到HEADER_SEP，不然的话代表连报头都没有接收完整 */ 

    size_t pos = inbuffer.find(HEADER_SEP);

    if (pos == std::string::npos)
    {
        return false;
    }

	/* 提取长度字符串 */

    std::string lenstr = inbuffer.substr(0, pos);

    // 转 int
    int body_len = std::stoi(lenstr);

	/* 计算报头的总长度 */

    size_t header_len = pos + HEADER_SEP_LEN;

    /* 计算我们接收到的数据是否是完整的 */

    if (inbuffer.size() < header_len + body_len)
    {
        // body 不完整
        return false;
    }

    /* 提取我们所需要的body字符串 */

    *body = inbuffer.substr(header_len,body_len);

    /* 清楚已经正确解析完成的一条报文 */

    inbuffer.erase(0,header_len + body_len);

    return true;
}
```