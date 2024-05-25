

CREATE TABLE public.users (
  id bigint NOT NULL,
  created_at timestamp(6) without time zone NOT NULL,
  updated_at timestamp(6) without time zone NOT NULL,
  identifier character varying NOT NULL,
  name character varying NOT NULL,
  last_message_at timestamp(6) without time zone,
  last_user_interaction_at timestamp(6) without time zone,
  last_sender_type character varying,
  unread_count integer DEFAULT 0
);

CREATE TABLE public.agent_users (
  id bigint NOT NULL,
  created_at timestamp(6) without time zone NOT NULL,
  updated_at timestamp(6) without time zone NOT NULL,
  user_id bigint NOT NULL,
  agent_id bigint NOT NULL,
  current_step character varying,
  final_step_at timestamp(6) without time zone,
  answers_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  openai_thread_id character varying
);

CREATE TABLE public.agents (
  id bigint NOT NULL,
  created_at timestamp(6) without time zone NOT NULL,
  updated_at timestamp(6) without time zone NOT NULL,
  name character varying NOT NULL,
  description text,
  first_message text NOT NULL,
  assistant_instructions text NOT NULL,
  openai_assistant_id character varying
);

CREATE TABLE public.messages (
  id bigint NOT NULL,
  created_at timestamp(6) without time zone NOT NULL,
  updated_at timestamp(6) without time zone NOT NULL,
  user_id bigint,
  client_id character varying,
  body text,
  message_type character varying NOT NULL,
  template_name character varying,
  template_locale character varying,
  template_payload jsonb,
  user_reaction character varying,
  user_reacted_at timestamp(6) without time zone,
  user_read_at timestamp(6) without time zone,
  client_read_at timestamp(6) without time zone,
  sent_at timestamp(6) without time zone,
  agent_user_id bigint,
  whatsapp_message_id character varying
);

CREATE TABLE public.clients (
  id character varying NOT NULL,
  created_at timestamp(6) without time zone NOT NULL,
  updated_at timestamp(6) without time zone NOT NULL,
  name character varying NOT NULL,
  phone_number character varying NOT NULL
);
