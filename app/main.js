const dgram = require("dgram");

const {DOMAIN_NAME} = require("./constants");
const {parseDnsHeader, createDnsSection, parseDnsQuestions} = require("./utils/dnsSections")
const {parseFlags, resolveCall, getEncodedDomainsFromBufferRequest, getQuestionByEncodedDomainBuffers, getAnswerBuffer} = require("./utils/decodeDomainName");

const udpSocket = dgram.createSocket("udp4");
udpSocket.bind(2053, "127.0.0.1");


udpSocket.on("message", (buf, rinfo) => {
    try {
        const parsedHeaderOptions = parseDnsHeader(buf);

        const flags = buf.readUInt16BE(2);
        const parsedFlags = parseFlags(flags);

        const options = {
            id: buf.readUint16BE(0),
            ...parsedFlags,
            qdcount: buf.readUint16BE(4),
            ancount: 2,
            nscount: 0,
            arcount: 0,
            qr: 1,
            aa: 0,
            tc: 0,
            ra: 0,
            z: 0,
            rcode: parsedFlags.opcode === 0 ? 0 : 4,
        }

        const responseIp = '203.0.113.1'; // Replace with the actual IP address you want to return

        console.log(options, 'options >>>>>>>>><<<<<<<<');

        const headerBuffer = resolveCall(options);

        const encodedDomainBuffers = getEncodedDomainsFromBufferRequest(buf, options.qdcount);
        const questionBuffers = getQuestionByEncodedDomainBuffers(encodedDomainBuffers, encodedDomainBuffers.length);
        console.log(questionBuffers.length, encodedDomainBuffers.length, '+++++');
        const answerBuffers = getAnswerBuffer(encodedDomainBuffers, responseIp ,questionBuffers.length);
        console.log(answerBuffers);
        console.log('--- answer buffers ---');

        // Ensure that the length of answerBuffers array matches the ancount
        if (answerBuffers.length !== options.ancount) {
            console.log(answerBuffers.length, options.ancount)
            throw new Error("Mismatch between ancount and the number of answers prepared. <<<<>>>>");
        }

        // const response = Buffer.concat([dnsHeaderBuffer, dnsQuestionBuffer, dnsAnswerBuffer]);
        const response = Buffer.concat([headerBuffer, ...questionBuffers, ...answerBuffers]);

        udpSocket.send(response, rinfo.port, rinfo.address);
    } catch (e) {
        console.log(`Error receiving data: ${e}`);
    }
});

udpSocket.on("error", (err) => {
    console.log(`Error: ${err}`);
});

udpSocket.on("listening", () => {
    const address = udpSocket.address();
    console.log(`Server listening ${address.address}:${address.port}`)
});
