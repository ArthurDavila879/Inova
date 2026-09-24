package com.inova.seed;

import com.inova.entity.Proposal;
import com.inova.entity.ProposalAnalysis;
import com.inova.entity.Tag;
import com.inova.entity.User;
import com.inova.entity.Vote;
import com.inova.entity.VoteDirection;
import com.inova.repository.ProposalAnalysisRepository;
import com.inova.repository.ProposalRepository;
import com.inova.repository.TagRepository;
import com.inova.repository.UserRepository;
import com.inova.repository.VoteRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Dados de demonstração executados somente quando app.seed.enabled=true.
 *
 * Exemplos:
 *   java -jar app.jar --spring.main.web-application-type=none --app.seed.enabled=true
 *   java -jar app.jar --spring.main.web-application-type=none --app.seed.enabled=true --app.seed.reset=true
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DatabaseSeeder implements ApplicationRunner {

    private static final String DEMO_DOMAIN = "@demo.inova.local";
    private static final String DEMO_PASSWORD = "Demo@123";

    private final UserRepository users;
    private final ProposalRepository proposals;
    private final VoteRepository votes;
    private final TagRepository tags;
    private final ProposalAnalysisRepository analyses;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;

    @Value("${app.seed.reset:false}")
    private boolean reset;

    public DatabaseSeeder(
            UserRepository users,
            ProposalRepository proposals,
            VoteRepository votes,
            TagRepository tags,
            ProposalAnalysisRepository analyses,
            PasswordEncoder passwordEncoder,
            JdbcTemplate jdbc) {
        this.users = users;
        this.proposals = proposals;
        this.votes = votes;
        this.tags = tags;
        this.analyses = analyses;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (reset) {
            clearDemoData();
        }

        if (users.existsByEmail("demo@demo.inova.local")) {
            System.out.println("[seed] Dados de demonstração já existem. Nada foi duplicado.");
            System.out.println("[seed] Para recriar apenas os mocks, execute com --app.seed.reset=true.");
            printCredentials();
            return;
        }

        String encodedPassword = passwordEncoder.encode(DEMO_PASSWORD);
        List<User> demoUsers = createUsers(encodedPassword);
        createProposals(demoUsers);
        createVotes(demoUsers);

        System.out.println("[seed] Seed concluído com sucesso.");
        System.out.printf("[seed] %d usuários, %d propostas e %d votos disponíveis para visualização.%n",
                users.count(), proposals.count(), votes.count());
        printCredentials();
    }

    /**
     * Remove somente registros pertencentes ao seed. Dados criados manualmente permanecem.
     */
    private void clearDemoData() {
        String pattern = "%" + DEMO_DOMAIN;

        // Primeiro votos para não violar as FKs de users/proposals.
        jdbc.update("""
                DELETE FROM votes
                WHERE user_id IN (SELECT id FROM users WHERE email LIKE ?)
                   OR proposal_id IN (
                       SELECT id FROM proposals
                       WHERE author_id IN (SELECT id FROM users WHERE email LIKE ?)
                   )
                """, pattern, pattern);

        jdbc.update("""
                DELETE FROM proposal_tags
                WHERE proposal_id IN (
                    SELECT id FROM proposals
                    WHERE author_id IN (SELECT id FROM users WHERE email LIKE ?)
                )
                """, pattern);

        jdbc.update("""
                DELETE FROM proposal_analysis
                WHERE proposal_id IN (
                    SELECT id FROM proposals
                    WHERE author_id IN (SELECT id FROM users WHERE email LIKE ?)
                )
                """, pattern);

        jdbc.update("""
                DELETE FROM proposals
                WHERE author_id IN (SELECT id FROM users WHERE email LIKE ?)
                """, pattern);

        jdbc.update("DELETE FROM users WHERE email LIKE ?", pattern);
        System.out.println("[seed] Mocks anteriores removidos. Recriando...");
    }

    private List<User> createUsers(String encodedPassword) {
        List<UserSeed> namedUsers = List.of(
                new UserSeed("Usuário Demo", "demo@demo.inova.local", "Centro", "Serra, ES"),
                new UserSeed("Maria Silva", "maria@demo.inova.local", "Centro", "Serra, ES"),
                new UserSeed("João Pereira", "joao@demo.inova.local", "Carapina", "Serra, ES"),
                new UserSeed("Ana Costa", "ana@demo.inova.local", "Nova Almeida", "Serra, ES"),
                new UserSeed("Carlos Ramos", "carlos@demo.inova.local", "Jardim Carapina", "Serra, ES"),
                new UserSeed("Lúcia Ferreira", "lucia@demo.inova.local", "Centro", "Serra, ES"),
                new UserSeed("Roberto Souza", "roberto@demo.inova.local", "Jacaraípe", "Serra, ES"),
                new UserSeed("Fernanda Alves", "fernanda@demo.inova.local", "Laranjeiras", "Serra, ES"));

        List<User> result = new ArrayList<>();
        for (UserSeed seed : namedUsers) {
            result.add(users.save(User.builder()
                    .name(seed.name())
                    .email(seed.email())
                    .password(encodedPassword)
                    .bairro(seed.bairro())
                    .cidade(seed.cidade())
                    .build()));
        }

        // Usuários comunitários deixam ranking, estatísticas e barras de voto visivelmente preenchidos.
        String[] bairros = {"Centro", "Carapina", "Laranjeiras", "Jacaraípe", "Nova Almeida", "Jardim Carapina"};
        for (int i = 1; i <= 72; i++) {
            result.add(users.save(User.builder()
                    .name("Morador Demo %02d".formatted(i))
                    .email("morador%02d%s".formatted(i, DEMO_DOMAIN))
                    .password(encodedPassword)
                    .bairro(bairros[(i - 1) % bairros.length])
                    .cidade("Serra, ES")
                    .build()));
        }
        return result;
    }

    private void createProposals(List<User> demoUsers) {
        List<ProposalSeed> seeds = List.of(
                new ProposalSeed(
                        "Arborização da Av. Central",
                        "A avenida possui trechos longos sem sombra. A proposta prevê arborização contínua para melhorar o conforto térmico de pedestres e do comércio local.",
                        "Centro", "via", "Av. Central - Serra/ES", "votacao", "🌳",
                        -20.1282, -40.3076,
                        List.of("Ipê-amarelo", "Calçada", "Alta prioridade"),
                        "R$ 22.000", 18, "3,0°C", "24 meses", "Paineira",
                        1),
                new ProposalSeed(
                        "Praça da Esperança - Revitalização",
                        "Revitalização da praça com espécies nativas, novas áreas sombreadas e recuperação dos espaços de convivência da comunidade.",
                        "Carapina", "praca", "Praça da Esperança - Carapina", "aprovada", "🌿",
                        -20.1960, -40.2680,
                        List.of("Espécies nativas", "Praça", "Biodiversidade"),
                        "R$ 35.000", 25, "4,0°C", "36 meses", "Jequitibá",
                        2),
                new ProposalSeed(
                        "Mais sombra na escola estadual",
                        "O pátio escolar possui pouca arborização e grande exposição ao sol. A proposta cria áreas sombreadas para recreio e circulação dos alunos.",
                        "Nova Almeida", "escola", "Nova Almeida - Serra/ES", "votacao", "🏫",
                        -20.0500, -40.1900,
                        List.of("Escola", "Conforto térmico", "Urgente"),
                        "R$ 9.500", 8, "2,0°C", "12 meses", "Nim indiano",
                        3),
                new ProposalSeed(
                        "Corredor Verde - Rua dos Pinheiros",
                        "Criação de corredor verde em uma rua residencial com alto fluxo de pedestres, ampliando a cobertura vegetal e reduzindo ilhas de calor.",
                        "Jardim Carapina", "calcada", "Rua dos Pinheiros - Jardim Carapina", "analise", "🌲",
                        -20.2100, -40.2850,
                        List.of("Corredor verde", "Pedestres", "Clima urbano"),
                        "R$ 13.000", 12, "2,5°C", "18 meses", "Ipê-amarelo",
                        4),
                new ProposalSeed(
                        "Ilhas verdes no estacionamento central",
                        "Implantação de ilhas de vegetação e árvores de copa ampla para reduzir a temperatura do estacionamento e melhorar a drenagem do local.",
                        "Centro", "calcada", "Centro - Serra/ES", "votacao", "🌴",
                        -20.1260, -40.3090,
                        List.of("Ilha verde", "Temperatura", "Drenagem"),
                        "R$ 13.000", 12, "2,5°C", "18 meses", "Ipê-amarelo",
                        5),
                new ProposalSeed(
                        "Recuperação da margem do Rio Jacaraípe",
                        "Recuperação de mata ciliar para ajudar no controle de erosão, proteção do rio e formação de um corredor ecológico de lazer.",
                        "Jacaraípe", "rio", "Margem do Rio Jacaraípe - Serra/ES", "aprovada", "🏞️",
                        -20.1270, -40.2000,
                        List.of("Mata ciliar", "Rio", "Parque linear"),
                        "R$ 80.000", 70, "5,0°C", "48 meses", "Embaúba",
                        6),
                new ProposalSeed(
                        "Arborização da rota até o terminal",
                        "Plantio de árvores em pontos estratégicos do trajeto de pedestres até o terminal para criar sombra e melhorar a caminhabilidade.",
                        "Laranjeiras", "via", "Laranjeiras - Serra/ES", "votacao", "🌱",
                        -20.1810, -40.2670,
                        List.of("Mobilidade", "Sombra", "Pedestres"),
                        "R$ 22.000", 18, "3,0°C", "24 meses", "Paineira",
                        7),
                new ProposalSeed(
                        "Bosque comunitário no bairro Centro",
                        "Transformação de uma área ociosa em pequeno bosque comunitário com espécies adequadas ao ambiente urbano e espaço de permanência.",
                        "Centro", "praca", "Centro - Serra/ES", "analise", "🌳",
                        -20.1300, -40.3030,
                        List.of("Bosque urbano", "Convivência", "Espécies nativas"),
                        "R$ 35.000", 25, "4,0°C", "36 meses", "Jequitibá",
                        0));

        for (ProposalSeed seed : seeds) {
            User author = demoUsers.get(seed.authorIndex());
            Set<Tag> proposalTags = new LinkedHashSet<>();
            for (String tagName : seed.tags()) {
                proposalTags.add(tags.findByName(tagName).orElseGet(() -> tags.save(Tag.builder().name(tagName).build())));
            }

            Proposal proposal = proposals.save(Proposal.builder()
                    .title(seed.title())
                    .description(seed.description())
                    .bairro(seed.bairro())
                    .tipo(seed.tipo())
                    .location(seed.location())
                    .status(seed.status())
                    .emoji(seed.emoji())
                    .latitude(seed.latitude())
                    .longitude(seed.longitude())
                    .author(author)
                    .tags(proposalTags)
                    .build());

            ProposalAnalysis analysis = analyses.save(ProposalAnalysis.builder()
                    .proposal(proposal)
                    .estimatedCost(seed.estimatedCost())
                    .treesRequired(seed.treesRequired())
                    .temperatureReduction(seed.temperatureReduction())
                    .implementationTime(seed.implementationTime())
                    .species(seed.species())
                    .build());
            proposal.setAnalysis(analysis);
        }
    }

    private void createVotes(List<User> demoUsers) {
        List<Proposal> demoProposals = proposals.findAllWithTagsOrderByIdDesc().stream()
                .filter(p -> p.getAuthor().getEmail().endsWith(DEMO_DOMAIN))
                .toList();

        if (demoProposals.isEmpty()) {
            return;
        }

        // Ordem decrescente vinda do repository; a regra abaixo gera placares distintos e determinísticos.
        for (int userIndex = 0; userIndex < demoUsers.size(); userIndex++) {
            User voter = demoUsers.get(userIndex);
            for (int proposalIndex = 0; proposalIndex < demoProposals.size(); proposalIndex++) {
                Proposal proposal = demoProposals.get(proposalIndex);

                // Nem todo usuário vota em toda proposta: deixa os totais variados.
                int threshold = 28 + (proposalIndex * 6);
                boolean participates = ((userIndex * 11 + proposalIndex * 7) % 80) < threshold;
                if (!participates) {
                    continue;
                }

                // Evita votos negativos excessivos e cria alguns para testar saldo/ranking.
                VoteDirection direction = ((userIndex + proposalIndex * 3) % 17 == 0)
                        ? VoteDirection.DOWN
                        : VoteDirection.UP;

                votes.save(Vote.builder()
                        .user(voter)
                        .proposal(proposal)
                        .direction(direction)
                        .build());
            }
        }
    }

    private void printCredentials() {
        System.out.println("[seed] Login demo: demo@demo.inova.local");
        System.out.println("[seed] Senha demo: " + DEMO_PASSWORD);
    }

    private record UserSeed(String name, String email, String bairro, String cidade) {}

    private record ProposalSeed(
            String title,
            String description,
            String bairro,
            String tipo,
            String location,
            String status,
            String emoji,
            Double latitude,
            Double longitude,
            List<String> tags,
            String estimatedCost,
            Integer treesRequired,
            String temperatureReduction,
            String implementationTime,
            String species,
            int authorIndex) {}
}
