package com.inova;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import java.net.*;
import java.net.http.*;
import java.util.*;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:inova;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa",
    "spring.datasource.password=", "jwt.secret=integration-test-secret-at-least-32-bytes",
    "app.upload-dir=target/test-uploads"
})
class ApiIntegrationTest {
    @LocalServerPort int port;
    final HttpClient client = HttpClient.newHttpClient();
    final JsonMapper json = new JsonMapper();

    HttpResponse<String> request(String method, String path, Object body, String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return client.send(builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
    tools.jackson.databind.JsonNode body(HttpResponse<String> response) {
        return json.readTree(response.body());
    }
    String register(String suffix) throws Exception {
        var response = request("POST", "/auth/register", Map.of("name", "Teste", "email", suffix + UUID.randomUUID() + "@example.com", "password", "valid-password"), null);
        assertEquals(200, response.statusCode(), response.body());
        return body(response).get("token").asText();
    }

    @Test void authenticationAndValidation() throws Exception {
        assertEquals(401, request("GET", "/auth/me", null, null).statusCode());
        assertEquals(401, request("PUT", "/auth/location", Map.of("bairro","Centro","cidade","Serra"), null).statusCode());
        assertEquals(401, request("GET", "/proposals", null, "invalid").statusCode());
        assertEquals(400, request("POST", "/auth/register", Map.of("name","", "email","bad","password","1"), null).statusCode());
        var credentials = Map.of("name","Teste", "email",UUID.randomUUID()+"@example.com", "password","password123");
        assertEquals(200, request("POST", "/auth/register", credentials, null).statusCode());
        assertEquals(400, request("POST", "/auth/register", credentials, null).statusCode());
        assertEquals(200, request("POST", "/auth/login", credentials, null).statusCode());
        assertEquals(400, request("POST", "/auth/login", Map.of("email",credentials.get("email"),"password","wrong"), null).statusCode());
        String token = register("location");
        assertEquals(200, request("PUT", "/auth/location", Map.of("bairro","Centro","cidade","Vitória"), token).statusCode());
        assertEquals("Vitória", body(request("GET", "/auth/me", null, token)).get("cidade").asText());
    }

    @Test void proposalVoteCrudAndOwnership() throws Exception {
        String owner = register("owner"), other = register("other");
        var proposal = Map.of("title","Praça", "desc","Arborizar praça", "bairro","Centro", "tipo","praca");
        var created = request("POST", "/proposals", proposal, owner);
        assertEquals(201, created.statusCode(), created.body());
        long id = body(created).get("id").asLong();
        String path = "/proposals/" + id;
        var details = body(request("GET", path, null, owner));
        assertEquals(1, details.get("votes").asInt());
        assertEquals(25, details.get("ia").get("treesRequired").asInt());
        assertEquals(200, request("POST", path+"/vote", Map.of("direction","down"), other).statusCode());
        assertEquals(0, body(request("GET",path,null,owner)).get("votes").asInt());
        request("POST",path+"/vote",Map.of("direction","up"),other);
        assertEquals(2, body(request("GET",path,null,owner)).get("votes").asInt());
        request("POST",path+"/vote",Map.of("direction","up"),other);
        assertEquals(1, body(request("GET",path,null,owner)).get("votes").asInt());
        assertEquals(400,request("POST",path+"/vote",Map.of("direction","sideways"),other).statusCode());
        assertEquals(200,request("GET","/proposals/ranking",null,owner).statusCode());
        var update = Map.of("title","Novo título", "desc","Descrição", "bairro","Outro bairro");
        assertEquals(403,request("PUT",path,update,other).statusCode());
        assertEquals(403,request("DELETE",path,null,other).statusCode());
        assertEquals(200,request("PUT",path,update,owner).statusCode());
        assertEquals("Novo título",body(request("GET",path,null,owner)).get("title").asText());
        assertEquals(204,request("DELETE",path,null,owner).statusCode());
        assertEquals(404,request("GET",path,null,owner).statusCode());
    }

    @Test void imageUploadAndRejection() throws Exception {
        String token = register("photo");
        var image = new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var bytes = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(image,"png",bytes);
        var proposal = new HashMap<String,Object>(Map.of("title","Foto", "desc","Local", "bairro","Centro", "tipo","via"));
        proposal.put("photo","data:image/png;base64,"+Base64.getEncoder().encodeToString(bytes.toByteArray()));
        var created = request("POST","/proposals",proposal,token);
        assertEquals(201,created.statusCode(),created.body());
        String path = "/proposals/"+body(created).get("id").asLong();
        String photo = body(request("GET",path,null,token)).get("photo").asText();
        assertTrue(photo.startsWith("/uploads/"));
        assertEquals(200,request("GET",photo,null,null).statusCode());
        proposal.put("photo","data:image/svg+xml;base64,PHN2Zz4=");
        assertEquals(400,request("POST","/proposals",proposal,token).statusCode());
        proposal.put("photo","data:image/png;base64,YmFk");
        assertEquals(400,request("POST","/proposals",proposal,token).statusCode());
    }

    @Test void expiredTokenAndVersionedRoutes() throws Exception {
        String token = register("expired");
        long userId = body(request("GET", "/api/v1/users/me", null, token)).get("id").asLong();
        var expired = new com.inova.security.JwtService("integration-test-secret-at-least-32-bytes", -1000).generate(userId);
        assertEquals(401, request("GET", "/proposals", null, expired).statusCode());
        assertEquals(401, request("GET", "/api/v1/auth/me", null, null).statusCode());
        assertEquals(200, request("GET", "/api/v1/proposals", null, token).statusCode());
        var created = request("POST", "/api/v1/proposals", Map.of("title","Versionada", "desc","Teste", "bairro","Centro", "tipo","via", "address","Rua de teste, 100"), token);
        assertEquals(201,created.statusCode(),created.body());
        String path = "/api/v1/proposals/"+body(created).get("id").asLong();
        assertEquals("Rua de teste, 100",body(request("GET",path,null,token)).get("location").asText());
        assertEquals(200, request("DELETE", path+"/votes", null, token).statusCode());
        assertEquals(200, request("DELETE", path+"/votes", null, token).statusCode());
        assertEquals(0,body(request("GET",path,null,token)).get("votes").asInt());
        request("DELETE",path,null,token);
    }

    @Test void invalidCategoryAndOversizedPhoto() throws Exception {
        String token = register("invalid");
        var proposal = new HashMap<String,Object>(Map.of("title","Teste", "desc","Teste", "bairro","Centro", "tipo","invalid"));
        assertEquals(400,request("POST","/proposals",proposal,token).statusCode());
        proposal.put("tipo","praca");
        proposal.put("photo","data:image/png;base64,"+"A".repeat(7_000_001));
        assertEquals(400,request("POST","/proposals",proposal,token).statusCode());
        assertEquals(404,request("POST","/proposals/99999999/vote",Map.of("direction","up"),token).statusCode());
    }
}
